import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import './TopNavTimeWidget.css';

export const TopNavTimeWidget = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedTime = currentTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  const timezoneAbbr = (() => {
    try {
      const parts = new Intl.DateTimeFormat('en-US', { timeZoneName: 'short' }).formatToParts(currentTime);
      const tz = parts.find((p) => p.type === 'timeZoneName')?.value;
      return tz || 'IST';
    } catch {
      return 'IST';
    }
  })();

  const weekday = currentTime.toLocaleDateString('en-US', { weekday: 'short' });
  const day = currentTime.getDate();
  const month = currentTime.toLocaleDateString('en-US', { month: 'short' });
  const year = currentTime.getFullYear();
  const formattedDate = `${weekday}, ${day} ${month}, ${year}`;

  return (
    <div className="nav-time-pill" title={`Current System Time (${timezoneAbbr})`}>
      <div className="nav-time-icon-circle">
        <Clock size={16} color="#2563eb" strokeWidth={2.4} />
      </div>
      <div className="nav-time-content">
        <div className="nav-time-top-row">
          <span className="nav-time-digital">{formattedTime}</span>
          <span className="nav-time-tz-badge">{timezoneAbbr}</span>
          <span className="nav-time-live-dot" />
        </div>
        <div className="nav-time-date">{formattedDate}</div>
      </div>
    </div>
  );
};
