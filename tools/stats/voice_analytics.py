"""
Sabrina Voice Analytics — Pretty graphs from voice_state_analytics.
Usage: python3 tools/stats/voice_analytics.py
"""

import sqlite3
import os
from datetime import datetime, timedelta
from collections import defaultdict

import matplotlib.pyplot as plt
import matplotlib.dates as mdates
import numpy as np

# ── Config ──────────────────────────────────────────────────────────────────
DB_PATH = os.path.join(os.path.dirname(__file__), "sabrina-prod-06-07-2026.db")
OUT_DIR = os.path.join(os.path.dirname(__file__), "charts")
os.makedirs(OUT_DIR, exist_ok=True)

# Style
plt.rcParams.update({
    "figure.facecolor": "#0f0f17",
    "axes.facecolor": "#0f0f17",
    "axes.edgecolor": "#2a2a3d",
    "axes.labelcolor": "#c4c4d4",
    "text.color": "#e0e0ec",
    "xtick.color": "#8888a0",
    "ytick.color": "#8888a0",
    "grid.color": "#1e1e2e",
    "grid.alpha": 0.6,
    "font.family": "sans-serif",
    "font.size": 11,
})

PALETTE = ["#a78bfa", "#f472b6", "#38bdf8", "#34d399", "#fb923c",
           "#facc15", "#f87171", "#818cf8", "#22d3ee", "#c084fc",
           "#4ade80", "#fbbf24", "#e879f9", "#2dd4bf"]


# ── Load data ───────────────────────────────────────────────────────────────
conn = sqlite3.connect(DB_PATH)
rows = conn.execute(
    "SELECT username, kind, channelName, guildName, timestamp FROM voice_state_analytics"
).fetchall()
conn.close()

print(f"Loaded {len(rows)} voice events from {DB_PATH}")

events = []
for username, kind, channel, guild, ts in rows:
    dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
    events.append({"user": username, "kind": kind, "channel": channel,
                   "guild": guild, "dt": dt})


# ── 1. Activity Heatmap (hour × day-of-week) ───────────────────────────────
def plot_heatmap():
    grid = np.zeros((7, 24))
    for e in events:
        grid[e["dt"].weekday()][e["dt"].hour] += 1

    fig, ax = plt.subplots(figsize=(14, 5))
    im = ax.imshow(grid, aspect="auto", cmap="magma", interpolation="nearest")
    ax.set_yticks(range(7))
    ax.set_yticklabels(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"])
    ax.set_xticks(range(24))
    ax.set_xticklabels([f"{h:02d}" for h in range(24)])
    ax.set_xlabel("Hour (UTC)")
    ax.set_title("Voice Activity Heatmap", fontsize=16, fontweight="bold", pad=12)
    cbar = fig.colorbar(im, ax=ax, pad=0.02)
    cbar.set_label("Events", color="#c4c4d4")
    cbar.ax.yaxis.set_tick_params(color="#8888a0")
    plt.setp(cbar.ax.yaxis.get_ticklabels(), color="#8888a0")
    fig.tight_layout()
    fig.savefig(os.path.join(OUT_DIR, "1_heatmap.png"), dpi=180)
    plt.close(fig)
    print("  ✓ 1_heatmap.png")


# ── 2. Top Users by Joins ──────────────────────────────────────────────────
def plot_top_users():
    counts = defaultdict(int)
    for e in events:
        if e["kind"] == "joined":
            counts[e["user"]] += 1

    users = sorted(counts.items(), key=lambda x: -x[1])
    names = [u for u, _ in users]
    vals = [v for _, v in users]

    fig, ax = plt.subplots(figsize=(12, 6))
    bars = ax.barh(names[::-1], vals[::-1], color=PALETTE[:len(names)][::-1],
                   edgecolor="#0f0f17", linewidth=0.5)
    ax.set_xlabel("Voice Channel Joins")
    ax.set_title("Who Hangs Out the Most?", fontsize=16, fontweight="bold", pad=12)
    ax.grid(axis="x", linestyle="--", alpha=0.3)

    for bar, val in zip(bars, vals[::-1]):
        ax.text(bar.get_width() + 8, bar.get_y() + bar.get_height() / 2,
                str(val), va="center", fontsize=10, color="#c4c4d4")

    fig.tight_layout()
    fig.savefig(os.path.join(OUT_DIR, "2_top_users.png"), dpi=180)
    plt.close(fig)
    print("  ✓ 2_top_users.png")


# ── 3. Channel Popularity ──────────────────────────────────────────────────
def plot_channel_popularity():
    counts = defaultdict(int)
    for e in events:
        if e["kind"] == "joined":
            counts[e["channel"]] += 1

    channels = sorted(counts.items(), key=lambda x: -x[1])
    names = [c for c, _ in channels]
    vals = [v for _, v in channels]

    fig, ax = plt.subplots(figsize=(8, 6))
    _, texts, autotexts = ax.pie(
        vals, labels=names, autopct=lambda p: f"{p:.1f}%" if p > 3 else "",
        colors=PALETTE[:len(names)],
        pctdistance=0.8, startangle=140,
        wedgeprops={"edgecolor": "#0f0f17", "linewidth": 1.5},
    )
    for t in texts:
        t.set_fontsize(10)
    for t in autotexts:
        t.set_fontsize(9)
        t.set_color("#e0e0ec")

    ax.set_title("Favorite Voice Channels", fontsize=16, fontweight="bold", pad=12)
    fig.tight_layout()
    fig.savefig(os.path.join(OUT_DIR, "3_channels.png"), dpi=180)
    plt.close(fig)
    print("  ✓ 3_channels.png")


# ── 4. Weekly Activity Trend ────────────────────────────────────────────────
def plot_weekly_trend():
    weekly = defaultdict(int)
    for e in events:
        if e["kind"] == "joined":
            # ISO week start (Monday)
            week_start = e["dt"] - timedelta(days=e["dt"].weekday())
            key = week_start.strftime("%Y-%m-%d")
            weekly[key] += 1

    weeks = sorted(weekly.keys())
    vals = [weekly[w] for w in weeks]
    dates = [datetime.strptime(w, "%Y-%m-%d") for w in weeks]

    fig, ax = plt.subplots(figsize=(14, 5))
    ax.fill_between(dates, vals, alpha=0.3, color="#a78bfa")
    ax.plot(dates, vals, color="#a78bfa", linewidth=2, marker="o", markersize=4)
    ax.set_xlabel("Week")
    ax.set_ylabel("Voice Joins")
    ax.set_title("Weekly Voice Activity Over Time", fontsize=16, fontweight="bold", pad=12)
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%b %d"))
    ax.xaxis.set_major_locator(mdates.MonthLocator())
    plt.xticks(rotation=45)
    ax.grid(axis="y", linestyle="--", alpha=0.3)
    fig.tight_layout()
    fig.savefig(os.path.join(OUT_DIR, "4_weekly_trend.png"), dpi=180)
    plt.close(fig)
    print("  ✓ 4_weekly_trend.png")


# ── 5. Event Types Breakdown ───────────────────────────────────────────────
def plot_event_types():
    counts = defaultdict(int)
    for e in events:
        counts[e["kind"]] += 1

    kinds = sorted(counts.items(), key=lambda x: -x[1])
    names = [k for k, _ in kinds]
    vals = [v for _, v in kinds]

    fig, ax = plt.subplots(figsize=(10, 5))
    bars = ax.bar(names, vals, color=PALETTE[:len(names)],
                  edgecolor="#0f0f17", linewidth=0.5)
    ax.set_ylabel("Count")
    ax.set_title("Voice Events Breakdown", fontsize=16, fontweight="bold", pad=12)
    ax.grid(axis="y", linestyle="--", alpha=0.3)

    for bar, val in zip(bars, vals):
        ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 30,
                str(val), ha="center", fontsize=10, color="#c4c4d4")

    fig.tight_layout()
    fig.savefig(os.path.join(OUT_DIR, "5_event_types.png"), dpi=180)
    plt.close(fig)
    print("  ✓ 5_event_types.png")


# ── 6. Per-User Activity Stacked Over Months ───────────────────────────────
def plot_user_monthly():
    user_month = defaultdict(lambda: defaultdict(int))
    for e in events:
        if e["kind"] == "joined":
            month_key = e["dt"].strftime("%Y-%m")
            user_month[month_key][e["user"]] += 1

    # Get top 8 users overall
    totals = defaultdict(int)
    for month_data in user_month.values():
        for user, count in month_data.items():
            totals[user] += count
    top_users = [u for u, _ in sorted(totals.items(), key=lambda x: -x[1])[:8]]

    months = sorted(user_month.keys())
    month_dates = [datetime.strptime(m, "%Y-%m") for m in months]

    fig, ax = plt.subplots(figsize=(14, 6))
    bottom = np.zeros(len(months))
    for i, user in enumerate(top_users):
        vals = np.array([user_month[m].get(user, 0) for m in months], dtype=float)
        ax.bar(month_dates, vals, bottom=bottom, label=user,
               color=PALETTE[i % len(PALETTE)], edgecolor="#0f0f17",
               linewidth=0.5, width=20)
        bottom += vals

    ax.set_xlabel("Month")
    ax.set_ylabel("Voice Joins")
    ax.set_title("Who's Active Each Month?", fontsize=16, fontweight="bold", pad=12)
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%b '%y"))
    ax.legend(loc="upper left", framealpha=0.3, edgecolor="#2a2a3d")
    ax.grid(axis="y", linestyle="--", alpha=0.3)
    fig.tight_layout()
    fig.savefig(os.path.join(OUT_DIR, "6_user_monthly.png"), dpi=180)
    plt.close(fig)
    print("  ✓ 6_user_monthly.png")


# ── 7. Streaming Leaderboard ───────────────────────────────────────────────
def plot_streaming():
    counts = defaultdict(int)
    for e in events:
        if e["kind"] == "started streaming":
            counts[e["user"]] += 1

    if not counts:
        print("  ⊘ No streaming data")
        return

    users = sorted(counts.items(), key=lambda x: -x[1])
    names = [u for u, _ in users]
    vals = [v for _, v in users]

    fig, ax = plt.subplots(figsize=(10, 5))
    bars = ax.barh(names[::-1], vals[::-1], color=PALETTE[2:2+len(names)][::-1],
                   edgecolor="#0f0f17", linewidth=0.5)
    ax.set_xlabel("Stream Sessions Started")
    ax.set_title("Streaming Leaderboard", fontsize=16, fontweight="bold", pad=12)
    ax.grid(axis="x", linestyle="--", alpha=0.3)

    for bar, val in zip(bars, vals[::-1]):
        ax.text(bar.get_width() + 3, bar.get_y() + bar.get_height() / 2,
                str(val), va="center", fontsize=10, color="#c4c4d4")

    fig.tight_layout()
    fig.savefig(os.path.join(OUT_DIR, "7_streaming.png"), dpi=180)
    plt.close(fig)
    print("  ✓ 7_streaming.png")


# ── 8. Hourly Activity Distribution ────────────────────────────────────────
def plot_hourly():
    hours = [0] * 24
    for e in events:
        if e["kind"] == "joined":
            hours[e["dt"].hour] += 1

    fig, ax = plt.subplots(figsize=(12, 5), subplot_kw={"projection": "polar"})
    angles = np.linspace(0, 2 * np.pi, 24, endpoint=False)
    values = np.array(hours, dtype=float)
    # Close the loop
    angles = np.append(angles, angles[0])
    values = np.append(values, values[0])

    ax.fill(angles, values, alpha=0.25, color="#a78bfa")
    ax.plot(angles, values, color="#a78bfa", linewidth=2)
    ax.set_xticks(np.linspace(0, 2 * np.pi, 24, endpoint=False))
    ax.set_xticklabels([f"{h:02d}" for h in range(24)])
    ax.set_title("When Do People Join? (UTC)", fontsize=16, fontweight="bold",
                 pad=20, color="#e0e0ec")
    ax.set_facecolor("#0f0f17")
    ax.spines["polar"].set_color("#2a2a3d")
    ax.grid(color="#1e1e2e", alpha=0.6)
    fig.tight_layout()
    fig.savefig(os.path.join(OUT_DIR, "8_hourly_polar.png"), dpi=180)
    plt.close(fig)
    print("  ✓ 8_hourly_polar.png")


# ── Run all ─────────────────────────────────────────────────────────────────
print(f"\nGenerating charts → {OUT_DIR}/\n")
plot_heatmap()
plot_top_users()
plot_channel_popularity()
plot_weekly_trend()
plot_event_types()
plot_user_monthly()
plot_streaming()
plot_hourly()
print(f"\nDone! {8} charts saved to {OUT_DIR}/")
