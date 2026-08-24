import React, { useState, useEffect } from 'react';
import { theme } from '../theme';
import { supabase } from '../lib/supabaseClient';
import { BottomNav } from '../components/BottomNav';
import './Stats.css';

const Stats = () => {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState([]);
  const [error, setError] = useState(null);

  const rootVars = {
    '--charcoal': theme.colors.charcoal,
    '--cardBg': theme.colors.cardBg,
    '--slate': theme.colors.slate,
    '--amber': theme.colors.projectorAmber,
    '--velvetRed': theme.colors.velvetRed,
    '--animeTeal': theme.colors.animeTeal,
    '--screenGlow': theme.colors.screenGlow,
    '--font-display': theme.fonts.display,
    '--font-body': theme.fonts.body,
    '--font-mono': theme.fonts.mono,
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No user logged in');
        const { data, error } = await supabase
          .from('watched_entries')
          .select('*')
          .eq('user_id', user.id);
        if (error) throw error;
        setEntries(data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return <div className="stats-loading" style={rootVars}>Loading stats...</div>;
  }

  if (error) {
    return <div className="stats-error" style={rootVars}>Error: {error}</div>;
  }

  const total = entries.length;
  const currentYear = new Date().getFullYear();
  const thisYear = entries.filter(e => {
    if (!e.watched_date) return false;
    return new Date(e.watched_date + 'T00:00:00').getFullYear() === currentYear;
  }).length;
  const rewatched = entries.filter(e => e.rewatched === true).length;

  const types = ['movie', 'tv', 'anime'];
  const typeCounts = types.map(t => entries.filter(e => e.media_type === t).length);
  const totalTypes = typeCounts.reduce((a, b) => a + b, 0);

  const starCounts = [1, 2, 3, 4, 5].map(star => {
    const ratingVal = star * 2;
    return entries.filter(e => e.rating === ratingVal).length;
  });
  const maxStarCount = Math.max(...starCounts, 1);

  const totalRatingSum = entries.reduce((sum, e) => sum + (e.rating || 0), 0);
  const avgStars = entries.length > 0 ? (totalRatingSum / entries.length) / 2 : 0;

  const now = new Date();
  const monthLabels = [];
  const monthCounts = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const key = `${y}-${m}`;
    monthLabels.push(key);
    const count = entries.filter(e => e.watched_date && e.watched_date.startsWith(key)).length;
    monthCounts.push(count);
  }
  const maxMonthCount = Math.max(...monthCounts, 1);

  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const weekdayCounts = weekdays.map((_, idx) => {
    return entries.filter(e => {
      if (!e.watched_date) return false;
      const date = new Date(e.watched_date + 'T00:00:00');
      return date.getDay() === idx;
    }).length;
  });
  const maxWeekdayCount = Math.max(...weekdayCounts, 1);

  const decadeMap = {};
  entries.forEach(e => {
    if (!e.year) return;
    const decade = Math.floor(e.year / 10) * 10;
    const key = `${decade}s`;
    decadeMap[key] = (decadeMap[key] || 0) + 1;
  });
  const decadeList = Object.entries(decadeMap).sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
  const maxDecadeCount = Math.max(...decadeList.map(([, c]) => c), 1);
  const hasDecadeData = decadeList.length > 0;

  const TYPE_COLOR = {
    movie: theme.colors.projectorAmber,
    tv: theme.colors.velvetRed,
    anime: theme.colors.animeTeal,
  };

  return (
    <div className="stats-page" style={rootVars}>
      <div className="stats-headline-row">
        <div className="stats-card">
          <div className="stats-card-value">{total}</div>
          <div className="stats-card-label">Total</div>
        </div>
        <div className="stats-card">
          <div className="stats-card-value">{thisYear}</div>
          <div className="stats-card-label">This Year</div>
        </div>
        <div className="stats-card">
          <div className="stats-card-value">{rewatched}</div>
          <div className="stats-card-label">Rewatches</div>
        </div>
      </div>

      <div className="sprocket-divider" />

      <div className="stats-section">
        <p className="stats-section-eyebrow">Breakdown</p>
        <h2 className="stats-section-title">Content Type</h2>
        {types.map((type, idx) => {
          const count = typeCounts[idx];
          const pct = totalTypes > 0 ? (count / totalTypes * 100) : 0;
          return (
            <div key={type} className="stats-row">
              <span className="stats-row-label">{type}</span>
              <span className="stats-row-count">{count}</span>
              <div className="stats-track">
                <div className="stats-fill" style={{ width: pct + '%', backgroundColor: TYPE_COLOR[type] }} />
              </div>
              <span className="stats-row-pct">{Math.round(pct)}%</span>
            </div>
          );
        })}
      </div>

      <div className="stats-section">
        <p className="stats-section-eyebrow">Ratings</p>
        <h2 className="stats-section-title">Distribution</h2>
        <div className="stats-avg-line">
          <span className="stats-avg-label">Average:</span>
          <span className="stats-avg-value">{avgStars.toFixed(1)} stars</span>
        </div>
        {[1, 2, 3, 4, 5].map((star, idx) => {
          const count = starCounts[idx];
          const pct = (count / maxStarCount) * 100;
          return (
            <div key={star} className="stats-row">
              <span className="stats-star-num">{star}</span>
              <div className="stats-track-tall">
                <div className="stats-fill" style={{ width: pct + '%', height: '100%', backgroundColor: theme.colors.projectorAmber }} />
              </div>
              <span className="stats-row-count">{count}</span>
            </div>
          );
        })}
      </div>

      <div className="stats-section">
        <p className="stats-section-eyebrow">Activity</p>
        <h2 className="stats-section-title">Last 12 Months</h2>
        <div className="stats-bar-chart">
          {monthCounts.map((count, idx) => {
            const height = (count / maxMonthCount) * 100;
            const label = monthLabels[idx].slice(5);
            return (
              <div key={idx} className="stats-bar-col">
                <div className="stats-bar" style={{ height: `${height}%`, minHeight: count > 0 ? '2px' : '0' }} />
                <span className="stats-bar-label">{label}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="stats-section">
        <p className="stats-section-eyebrow">Habits</p>
        <h2 className="stats-section-title">Weekday Breakdown</h2>
        <div className="stats-bar-chart" style={{ height: '110px' }}>
          {weekdayCounts.map((count, idx) => {
            const height = (count / maxWeekdayCount) * 100;
            return (
              <div key={idx} className="stats-bar-col">
                <div className="stats-bar" style={{ height: `${height}%`, minHeight: count > 0 ? '2px' : '0' }} />
                <span className="stats-bar-label">{weekdays[idx].slice(0, 3)}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="stats-section">
        <p className="stats-section-eyebrow">Timeline</p>
        <h2 className="stats-section-title">Decades Watched</h2>
        {hasDecadeData ? (
          decadeList.map(([decade, count]) => {
            const pct = (count / maxDecadeCount) * 100;
            return (
              <div key={decade} className="stats-row">
                <span className="stats-row-label" style={{ width: '50px' }}>{decade}</span>
                <div className="stats-track-decade">
                  <div className="stats-fill" style={{ width: pct + '%', height: '100%', backgroundColor: theme.colors.animeTeal }} />
                </div>
                <span className="stats-row-count">{count}</span>
              </div>
            );
          })
        ) : (
          <p className="stats-empty-note">No decade data yet. This fills in as you log new titles.</p>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Stats;
