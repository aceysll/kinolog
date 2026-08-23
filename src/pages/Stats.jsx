import React, { useState, useEffect } from 'react';
import { theme } from '../theme';
import { supabase } from '../lib/supabaseClient';
import { BottomNav } from '../components/BottomNav';

const Stats = () => {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState([]);
  const [error, setError] = useState(null);

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
    return (
      <div style={{ backgroundColor: theme.colors.charcoal, minHeight: '100vh', padding: '16px', color: theme.colors.screenGlow }}>
        Loading stats...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ backgroundColor: theme.colors.charcoal, minHeight: '100vh', padding: '16px', color: theme.colors.velvetRed }}>
        Error: {error}
      </div>
    );
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

  const StatCard = ({ label, value }) => (
    <div style={{
      flex: 1,
      backgroundColor: theme.colors.cardBg,
      borderRadius: '12px',
      padding: '12px',
      textAlign: 'center'
    }}>
      <div style={{ color: theme.colors.screenGlow, fontSize: '24px', fontFamily: theme.fonts.display, fontWeight: 'bold' }}>
        {value}
      </div>
      <div style={{ color: theme.colors.slate, fontSize: '12px', fontFamily: theme.fonts.body }}>
        {label}
      </div>
    </div>
  );

  const Section = ({ title, children }) => (
    <div style={{ backgroundColor: theme.colors.cardBg, borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
      <h2 style={{ color: theme.colors.screenGlow, fontFamily: theme.fonts.display, fontSize: '18px', margin: '0 0 12px 0' }}>
        {title}
      </h2>
      {children}
    </div>
  );

  return (
    <div style={{ backgroundColor: theme.colors.charcoal, minHeight: '100vh', padding: '16px 16px 80px' }}>
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
        <StatCard label="Total" value={total} />
        <StatCard label="This Year" value={thisYear} />
        <StatCard label="Rewatches" value={rewatched} />
      </div>

      <Section title="Content Type Breakdown">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {types.map((type, idx) => {
            const count = typeCounts[idx];
            const pct = totalTypes > 0 ? (count / totalTypes * 100) : 0;
            const color = type === 'movie' ? theme.colors.projectorAmber : type === 'tv' ? theme.colors.velvetRed : theme.colors.animeTeal;
            return (
              <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: theme.colors.screenGlow, fontFamily: theme.fonts.body, width: '60px' }}>
                  {type}
                </span>
                <span style={{ color: theme.colors.slate, width: '40px', textAlign: 'right', fontFamily: theme.fonts.body }}>
                  {count}
                </span>
                <div style={{ flex: 1, height: '8px', backgroundColor: theme.colors.charcoal, borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: pct + '%', height: '100%', backgroundColor: color, borderRadius: '4px' }} />
                </div>
                <span style={{ color: theme.colors.slate, width: '40px', fontFamily: theme.fonts.body }}>
                  {Math.round(pct)}%
                </span>
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="Ratings Distribution">
        <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '12px' }}>
          <span style={{ color: theme.colors.screenGlow, fontFamily: theme.fonts.body, marginRight: '4px' }}>Average:</span>
          <span style={{ color: theme.colors.projectorAmber, fontFamily: theme.fonts.display, fontWeight: 'bold' }}>
            {avgStars.toFixed(1)} stars
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {[1, 2, 3, 4, 5].map((star, idx) => {
            const count = starCounts[idx];
            const pct = (count / maxStarCount) * 100;
            return (
              <div key={star} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: theme.colors.slate, width: '24px', fontFamily: theme.fonts.body }}>{star}</span>
                <div style={{ flex: 1, height: '20px', backgroundColor: theme.colors.charcoal, borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: pct + '%', height: '100%', backgroundColor: theme.colors.projectorAmber, borderRadius: '4px' }} />
                </div>
                <span style={{ color: theme.colors.slate, width: '30px', fontFamily: theme.fonts.body, textAlign: 'right' }}>
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="Watching Activity (Last 12 Months)">
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '150px', paddingBottom: '20px' }}>
          {monthCounts.map((count, idx) => {
            const height = (count / maxMonthCount) * 100;
            const label = monthLabels[idx].slice(5);
            return (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                <div style={{
                  height: `${height}%`,
                  width: '100%',
                  backgroundColor: theme.colors.screenGlow,
                  borderRadius: '2px 2px 0 0',
                  minHeight: count > 0 ? '2px' : '0'
                }} />
                <span style={{ color: theme.colors.slate, fontSize: '10px', fontFamily: theme.fonts.body, marginTop: '4px' }}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="Weekday Breakdown">
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '120px', paddingBottom: '20px' }}>
          {weekdayCounts.map((count, idx) => {
            const height = (count / maxWeekdayCount) * 100;
            return (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                <div style={{
                  height: `${height}%`,
                  width: '100%',
                  backgroundColor: theme.colors.screenGlow,
                  borderRadius: '2px 2px 0 0',
                  minHeight: count > 0 ? '2px' : '0'
                }} />
                <span style={{ color: theme.colors.slate, fontSize: '8px', fontFamily: theme.fonts.body, marginTop: '4px' }}>
                  {weekdays[idx].slice(0, 3)}
                </span>
              </div>
            );
          })}
        </div>
      </Section>

      <BottomNav />
    </div>
  );
};

export default Stats;
