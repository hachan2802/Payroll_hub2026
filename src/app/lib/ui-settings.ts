import localforage from 'localforage';

export interface UiSettings {
  bg: string;
  bgImage: string;
  bgImageStyle?:
    | 'cover'
    | 'contain'
    | 'original'
    | 'pattern-sm'
    | 'pattern-md'
    | 'pattern-lg'
    | 'brand-stripes-purple'
    | 'brand-stripes-green'
    | 'brand-stripes-brown';
  bgImageOpacity?: number;
  accent: string;
  text: string;
  border: string;
  fontSize: string;
  tablePadding: string;
  sidebarPos: 'left' | 'right';
  radius: string;
  titleAlign: string;
  tableFont?: string;
  autoSave?: boolean;
  showHelp?: boolean;
  stripeColor1?: string;
  stripeColor2?: string;
}

export const defaultSettings: UiSettings = {
  bg: '#F6F4F0',
  bgImage: '',
  bgImageStyle: 'cover',
  bgImageOpacity: 100,
  accent: '#C88493',
  text: '#5D111A',
  border: '#E7DBDC',
  fontSize: '13px',
  tablePadding: '12px 16px',
  sidebarPos: 'left',
  radius: '2rem',
  titleAlign: 'flex-start|left',
  tableFont: "var(--font-main)",
  autoSave: true,
  showHelp: true,
  stripeColor1: '#F6F4F0',
  stripeColor2: '#F4ECD8',
};

export const UI_SETTINGS_KEY = 'PayrollApp_UiSettings';

function isValidHex(color: unknown): boolean {
  return typeof color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(color);
}

export function applyUiSettings(settings: UiSettings) {
  const root = document.documentElement;

  root.classList.remove('dark');
  if (settings.bg) root.style.setProperty('--background', settings.bg);
  if (settings.text) root.style.setProperty('--foreground', settings.text);
  if (settings.border) root.style.setProperty('--border', settings.border);
  if (settings.accent) {
    root.style.setProperty('--primary', settings.accent);
    root.style.setProperty('--secondary', settings.accent);
  }

  if (settings.bgImageStyle?.startsWith('brand-stripes-')) {
    root.style.setProperty('--bg-image-opacity', ((settings.bgImageOpacity ?? 100) / 100).toString());
    root.style.setProperty('--bg-image-size', '20px 20px');
    root.style.setProperty('--bg-image-repeat', 'repeat');
    root.style.setProperty('--bg-image-attachment', 'fixed');
    
    if (settings.bgImageStyle === 'brand-stripes-purple') {
      root.style.setProperty('--bg-image', 'var(--pattern-stripes-purple)');
    } else if (settings.bgImageStyle === 'brand-stripes-green') {
      root.style.setProperty('--bg-image', 'var(--pattern-stripes-green)');
    } else if (settings.bgImageStyle === 'brand-stripes-brown') {
      root.style.setProperty('--bg-image', 'var(--pattern-stripes-brown)');
    }
  } else if (settings.bgImage) {
    root.style.setProperty('--bg-image', `url(${settings.bgImage})`);
    root.style.setProperty('--bg-image-attachment', 'fixed');
    root.style.setProperty(
      '--bg-image-opacity',
      ((settings.bgImageOpacity ?? 100) / 100).toString()
    );
    if (settings.bgImageStyle === 'pattern-sm') {
      root.style.setProperty('--bg-image-size', '50px');
      root.style.setProperty('--bg-image-repeat', 'repeat');
      root.style.setProperty('--bg-image-position', 'top left');
    } else if (settings.bgImageStyle === 'pattern-md') {
      root.style.setProperty('--bg-image-size', '100px');
      root.style.setProperty('--bg-image-repeat', 'repeat');
      root.style.setProperty('--bg-image-position', 'top left');
    } else if (settings.bgImageStyle === 'pattern-lg') {
      root.style.setProperty('--bg-image-size', '200px');
      root.style.setProperty('--bg-image-repeat', 'repeat');
      root.style.setProperty('--bg-image-position', 'top left');
    } else if (settings.bgImageStyle === 'contain') {
      root.style.setProperty('--bg-image-size', 'contain');
      root.style.setProperty('--bg-image-repeat', 'no-repeat');
      root.style.setProperty('--bg-image-position', 'center');
    } else if (settings.bgImageStyle === 'original') {
      root.style.setProperty('--bg-image-size', 'auto');
      root.style.setProperty('--bg-image-repeat', 'no-repeat');
      root.style.setProperty('--bg-image-position', 'center');
    } else {
      root.style.setProperty('--bg-image-size', 'cover');
      root.style.setProperty('--bg-image-repeat', 'no-repeat');
      root.style.setProperty('--bg-image-position', 'center');
    }
  } else {
    root.style.removeProperty('--bg-image');
    root.style.removeProperty('--bg-image-size');
    root.style.removeProperty('--bg-image-repeat');
    root.style.removeProperty('--bg-image-position');
    root.style.removeProperty('--bg-image-attachment');
    root.style.setProperty('--bg-image-opacity', '0');
  }

  if (settings.accent) {
    root.style.setProperty('--primary', settings.accent);
    root.style.setProperty('--secondary', settings.accent);
    root.style.setProperty('--ring', settings.accent);
  }
  if (settings.text) {
    root.style.setProperty('--foreground', settings.text);
  }
  if (settings.border) {
    root.style.setProperty('--border', settings.border);
    root.style.setProperty('--shadow-hard', `4px 4px 0px ${settings.border}`);
    root.style.setProperty('--shadow-hard-sm', `2px 2px 0px ${settings.border}`);
  }
  if (settings.fontSize) root.style.setProperty('--font-size', settings.fontSize);
  if (settings.tablePadding) root.style.setProperty('--table-padding', settings.tablePadding);
  if (settings.radius) root.style.setProperty('--radius', settings.radius);
  if (settings.tableFont) root.style.setProperty('--font-table', settings.tableFont);
  if (settings.stripeColor1) root.style.setProperty('--stripe-color1', settings.stripeColor1);
  if (settings.stripeColor2) root.style.setProperty('--stripe-color2', settings.stripeColor2);
  
  if (settings.titleAlign) {
    const [flexAlign, textAlign] = settings.titleAlign.split('|');
    root.style.setProperty('--title-align', flexAlign);
    root.style.setProperty('--text-align', textAlign);
  }

  if (settings.sidebarPos === 'right') {
    document.body.classList.add('sidebar-right');
  } else {
    document.body.classList.remove('sidebar-right');
  }
}

export async function loadUiSettings(): Promise<UiSettings> {
  const sanitize = (s: unknown): UiSettings => {
    const sObj = (s && typeof s === 'object' ? s : {}) as Partial<UiSettings>;
    const result = { ...defaultSettings, ...sObj };
    // Force valid hex for specific fields
    if (!isValidHex(result.accent)) result.accent = defaultSettings.accent;
    if (!isValidHex(result.text)) result.text = defaultSettings.text;
    if (!isValidHex(result.border)) result.border = defaultSettings.border;
    if (!isValidHex(result.bg)) result.bg = defaultSettings.bg;
    if (result.stripeColor1 && !isValidHex(result.stripeColor1)) result.stripeColor1 = defaultSettings.stripeColor1;
    if (result.stripeColor2 && !isValidHex(result.stripeColor2)) result.stripeColor2 = defaultSettings.stripeColor2;

    // Validate bgImage URL (must start with http, https or data:)
    if (result.bgImage && !result.bgImage.startsWith('http') && !result.bgImage.startsWith('data:')) {
      result.bgImage = '';
    }
    
    return result;
  };

  try {
    const saved = await localforage.getItem<UiSettings>(UI_SETTINGS_KEY);
    if (saved) return sanitize(saved);
    
    const legacySaved = localStorage.getItem(UI_SETTINGS_KEY);
    if (legacySaved) {
      try {
        const parsed = JSON.parse(legacySaved);
        return sanitize(parsed);
      } catch {
        // Ignore parsing errors
      }
    }
  } catch {
    // Ignore storage errors
  }
  return defaultSettings;
}
