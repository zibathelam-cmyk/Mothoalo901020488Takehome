const GENRE_TONES = {
  Technology: 'violet',
  'Cultural Studies': 'plum',
  History: 'olive',
  Business: 'amber',
  Poetry: 'rose',
  Fiction: 'blue',
  Mathematics: 'teal',
};

export const genreTone = (genre) => GENRE_TONES[genre] || 'slate';

export const initials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

export const shortDate = (value) =>
  new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

export const longDate = (value) =>
  new Date(value).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

export const timeOfDay = (value) =>
  new Date(value).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
