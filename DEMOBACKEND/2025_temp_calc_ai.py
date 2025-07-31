import pandas as pd
import numpy as np
import re
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
from sklearn.ensemble import RandomForestClassifier
from sklearn.calibration import CalibratedClassifierCV
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
import matplotlib.pyplot as plt

# --- Configurable Parameters ------------------------------------------------------------------------------------------
N_CLUSTERS = 5
N_ESTIMATORS = 200
CALIBRATION_CV = 5
TEST_SIZE = 0.3
RANDOM_STATE = 42


# --- Data Ingestion + Preprocessing -----------------------------------------------------------------------------------
def load_and_preprocess(filepath):
    df = pd.read_csv(filepath)
    df.rename(columns={
        'Auton.autonLeave':            'auton_leave',
        'Auton.autonCoral L4':         'auton_coral_l4',
        'Auton.autonCoral L3':         'auton_coral_l3',
        'Auton.autonCoral L2':         'auton_coral_l2',
        'Auton.autonCoralMissed':      'auton_coral_missed',
        'Auton.autonProc':             'auton_proc',
        'Auton.autonNet':              'auton_net',
        'Match.matchCoral L4':         'match_coral_l4',
        'Match.matchCoral L3':         'match_coral_l3',
        'Match.matchCoral L2':         'match_coral_l2',
        'Match.MatchCoralMissed':      'match_coral_missed',
        'Match.matchProc':             'match_proc',
        'Match.matchNet':              'match_net',
        'Post Match.robotSpeed':       'robot_speed',
        'Post Match.driverSkill':      'driver_skill',
        'Post Match.Defense':          'defense',
        'Post Match.defenseSkill':     'defense_skill',
        'Pre Match.teanNum':           'team_num',
        'Pre Match.match_num':         'match_num',
        'Pre Match.allianceColor':     'alliance_color'
    }, inplace=True)
    # Feature engineering
    df['leave_success']    = (df['auton_leave'] == 'Yes').astype(int)
    df['total_coral']      = df[['match_coral_l4','match_coral_l3','match_coral_l2']].sum(axis=1)
    df['coral_efficiency'] = df['total_coral'] / 135
    df['algae_total']      = df['match_net'] + df['match_proc']
    df['algae_efficiency'] = df['algae_total'] / 9
    df['defense_flag']     = (df['defense'] == 'Yes').astype(int)
    return df


# --- Team Feature Engineering -----------------------------------------------------------------------------------------
def compute_team_stats(df):
    agg = {
        'leave_success':     'mean',
        'auton_coral_l4':    'mean',
        'auton_coral_l3':    'mean',
        'auton_coral_l2':    'mean',
        'auton_coral_missed':'mean',
        'auton_proc':        'mean',
        'auton_net':         'mean',
        'match_coral_l4':    'mean',
        'match_coral_l3':    'mean',
        'match_coral_l2':    'mean',
        'match_coral_missed':'mean',
        'match_proc':        'mean',
        'match_net':         'mean',
        'total_coral':       'mean',
        'coral_efficiency':  'mean',
        'algae_efficiency':  'mean',
        'robot_speed':       'mean',
        'driver_skill':      'mean',
        'defense_flag':      'mean',
        'defense_skill':     'mean'
    }
    stats = df.groupby('team_num').agg(agg).fillna(0)
    stats['performance_score'] = (
        stats['coral_efficiency'] * 0.5 +
        stats['algae_efficiency'] * 0.2 +
        stats['driver_skill'] * 0.3
    )
    return stats


# --- Clustering / Archetype Classification ----------------------------------------------------------------------------
def describe_clusters(stats):
    features = ['coral_efficiency','algae_efficiency','leave_success',
                'driver_skill','robot_speed','performance_score']
    summary = stats.groupby('cluster')[features].mean()
    print('Cluster feature averages:')
    print(summary)
    return summary


def cluster_teams(stats, n_clusters=N_CLUSTERS):
    scaler = StandardScaler()
    X = scaler.fit_transform(stats.drop(columns=['performance_score']))
    model = KMeans(n_clusters=n_clusters, random_state=RANDOM_STATE)
    stats['cluster'] = model.fit_predict(X)
    return stats, scaler, model


# --- Synergy Modeling -------------------------------------------------------------------------------------------------
def compute_synergy(df, team_to_cluster):
    rows = []
    for (match, color), grp in df.groupby(['match_num','alliance_color']):
        teams = grp['team_num'].values
        if len(teams) != 3:
            continue
        combo = tuple(sorted(team_to_cluster[t] for t in teams))
        score = grp[['match_coral_l4','match_coral_l3','match_coral_l2','match_proc']].sum().sum()
        rows.append({'combo': combo, 'score': score})
    syn = pd.DataFrame(rows).groupby('combo')['score'].mean().rename('synergy_score')
    return syn


# --- Match Outcome Modeling -------------------------------------------------------------------------------------------
def build_match_df(df, stats, team_to_cluster, k):
    records = []
    for _, grp in df.groupby('match_num'):
        sides = {c: g for c, g in grp.groupby('alliance_color')}
        if not {'redAlliance','blueAlliance'}.issubset(sides):
            continue
        red, blue = sides['redAlliance'], sides['blueAlliance']
        red_teams = red['team_num'].values
        blue_teams = blue['team_num'].values
        def cnt(g): return np.bincount([team_to_cluster[t] for t in g['team_num']], minlength=k)
        row = {f'red_{i}': cnt(red)[i] for i in range(k)}
        row.update({f'blue_{i}': cnt(blue)[i] for i in range(k)})
        row['red_perf']  = stats.loc[red_teams, 'performance_score'].mean()
        row['blue_perf'] = stats.loc[blue_teams, 'performance_score'].mean()
        red_score  = red[['match_coral_l4','match_coral_l3','match_coral_l2','match_proc']].sum().sum()
        blue_score = blue[['match_coral_l4','match_coral_l3','match_coral_l2','match_proc']].sum().sum()
        row['red_win'] = int(red_score > blue_score)
        records.append(row)
    return pd.DataFrame(records)


def train_classifier(match_df):
    cluster_feats = [c for c in match_df.columns if re.match(r'^(?:red|blue)_\d+$', c)]
    perf_feats    = ['red_perf', 'blue_perf']
    feats = cluster_feats + perf_feats
    X = match_df[feats]
    y = match_df['red_win']
    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=TEST_SIZE, random_state=RANDOM_STATE)
    base_clf = RandomForestClassifier(n_estimators=N_ESTIMATORS, random_state=RANDOM_STATE)
    clf = CalibratedClassifierCV(base_clf, cv=CALIBRATION_CV)
    clf.fit(X_tr, y_tr)
    print('Calibrated accuracy:', accuracy_score(y_te, clf.predict(X_te)))
    return clf, feats


# --- Ranking + Recommendation -----------------------------------------------------------------------------------------
def rank_teams(stats):
    return stats.sort_values('performance_score', ascending=False)


def recommend_alliance(your_team, partner, stats, syn, clf, feats, k, top_n=5):
    yc, pc = stats.loc[your_team, 'cluster'], stats.loc[partner, 'cluster']
    y_perf, p_perf = stats.loc[your_team, 'performance_score'], stats.loc[partner, 'performance_score']
    candidates = []
    for t in stats.index:
        if t in {your_team, partner}: continue
        c = stats.loc[t, 'cluster']
        combo = tuple(sorted([yc, pc, c]))
        synergy = syn.get(combo, syn.mean())
        perf_vals = [y_perf, p_perf, stats.loc[t, 'performance_score']]
        cnts = np.bincount([yc, pc, c], minlength=k)
        data = {f'red_{i}': cnts[i] for i in range(k)}
        data.update({f'blue_{i}': 0 for i in range(k)})
        data['red_perf']  = np.mean(perf_vals)
        data['blue_perf'] = 0
        df_in = pd.DataFrame([data])[feats]
        prob = clf.predict_proba(df_in)[0,1]
        score = 0.6*prob + 0.4*(synergy / syn.max())
        candidates.append({'team': t, 'cluster': c, 'win_prob': prob, 'synergy': synergy,
                           'perf': stats.loc[t, 'performance_score'], 'combined_score': score})
    return pd.DataFrame(candidates).sort_values('combined_score', ascending=False).head(top_n)


# ---Visualization / Debug ---------------------------------------------------------------------------------------------
def plot_pca(stats, scaler):
    proj = PCA(2).fit_transform(scaler.transform(stats.drop(columns=['cluster','performance_score'])))
    plt.figure(figsize=(7,5))
    plt.scatter(proj[:,0], proj[:,1], c=stats['cluster'], s=30)
    plt.title('Cluster PCA')
    plt.grid(True)
    plt.show()


def main():
    pd.set_option("display.max_columns", None)
    pd.set_option("display.width", 0)
    pd.set_option("display.max_colwidth", None)

    df = load_and_preprocess('all_matches.csv')
    stats = compute_team_stats(df)
    stats, scaler, kmeans = cluster_teams(stats)

    # Describe cluster strengths
    describe_clusters(stats)

    syn = compute_synergy(df, stats['cluster'])
    print('Top synergy combos:', syn.sort_values(ascending=False).head(10))

    ranking = rank_teams(stats)
    print('Team rankings:', ranking['performance_score'].head())

    match_df = build_match_df(df, stats, stats['cluster'], kmeans.n_clusters)
    clf, feats = train_classifier(match_df)

    recs = recommend_alliance(3473, 33, stats, syn, clf, feats, kmeans.n_clusters)
    print('Alliance recommendations:\n', recs)

if __name__ == '__main__':
    main()
