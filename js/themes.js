/*
 * AlimenCal – Themes.
 * Vordefinierte Themes und benutzerdefinierte Anpassungen über CSS-Variablen.
 * DOM-frei (bis auf setTheme), damit die Definitionen auch in Node.js
 * (Unit-Tests) geprüft werden können.
 */
var AlimenCal = typeof AlimenCal !== 'undefined' ? AlimenCal : {};

AlimenCal.themes = (function () {
  'use strict';

  var TOKENS = [
    { key: 'bg', label: { de: 'Hintergrund', fr: 'Arrière-plan', it: 'Sfondo', en: 'Background' }, type: 'color' },
    { key: 'card', label: { de: 'Karten', fr: 'Cartes', it: 'Schede', en: 'Cards' }, type: 'color' },
    { key: 'ink', label: { de: 'Text', fr: 'Texte', it: 'Testo', en: 'Text' }, type: 'color' },
    { key: 'muted', label: { de: 'Sekundärtext', fr: 'Texte secondaire', it: 'Testo secondario', en: 'Muted text' }, type: 'color' },
    { key: 'accent', label: { de: 'Akzentfarbe', fr: 'Couleur d’accent', it: 'Colore d’accento', en: 'Accent colour' }, type: 'color' },
    { key: 'bannerBg', label: { de: 'Banner oben', fr: 'Bandeau supérieur', it: 'Banner in alto', en: 'Top banner' }, type: 'color' },
    { key: 'bannerInk', label: { de: 'Text auf Banner', fr: 'Texte sur bandeau', it: 'Testo su banner', en: 'Text on banner' }, type: 'color' },
    { key: 'accentDark', label: { de: 'Akzent dunkel', fr: 'Accent foncé', it: 'Accento scuro', en: 'Accent dark' }, type: 'color' },
    { key: 'accentInk', label: { de: 'Text auf Akzent', fr: 'Texte sur accent', it: 'Testo su accento', en: 'Text on accent' }, type: 'color' },
    { key: 'warn', label: { de: 'Warnung', fr: 'Avertissement', it: 'Avviso', en: 'Warning' }, type: 'color' },
    { key: 'warnBg', label: { de: 'Warnung Hintergrund', fr: 'Avertissement fond', it: 'Avviso sfondo', en: 'Warning background' }, type: 'color' },
    { key: 'warnBorder', label: { de: 'Warnung Rahmen', fr: 'Avertissement bordure', it: 'Avviso bordo', en: 'Warning border' }, type: 'color' },
    { key: 'line', label: { de: 'Linien / Rahmen', fr: 'Lignes / bordures', it: 'Linee / bordi', en: 'Lines / borders' }, type: 'color' },
    { key: 'inputBg', label: { de: 'Eingabefelder', fr: 'Champs de saisie', it: 'Campi di inserimento', en: 'Input fields' }, type: 'color' },
    { key: 'btnSecondaryBg', label: { de: 'Sekundäre Buttons', fr: 'Boutons secondaires', it: 'Pulsanti secondari', en: 'Secondary buttons' }, type: 'color' },
    { key: 'disclaimerBg', label: { de: 'Disclaimer Hintergrund', fr: 'Avertissement fond', it: 'Disclaimer sfondo', en: 'Disclaimer background' }, type: 'color' },
    { key: 'disclaimerBorder', label: { de: 'Disclaimer Rahmen', fr: 'Avertissement bordure', it: 'Disclaimer bordo', en: 'Disclaimer border' }, type: 'color' },
    { key: 'radius', label: { de: 'Eckenradius (px)', fr: 'Rayon des coins (px)', it: 'Raggio degli angoli (px)', en: 'Corner radius (px)' }, type: 'number' }
  ];

  var TOKEN_TO_CSS = {
    bg: '--bg',
    card: '--card',
    ink: '--ink',
    muted: '--muted',
    accent: '--accent',
    bannerBg: '--banner-bg',
    bannerInk: '--banner-ink',
    accentDark: '--accent-dark',
    accentInk: '--accent-ink',
    warn: '--warn',
    warnBg: '--warn-bg',
    warnBorder: '--warn-border',
    line: '--line',
    inputBg: '--input-bg',
    btnSecondaryBg: '--btn-secondary-bg',
    disclaimerBg: '--disclaimer-bg',
    disclaimerBorder: '--disclaimer-border',
    radius: '--radius'
  };

  /* Design-Stile (neben den Farb-Tokens): steuern Typografie, Schatten,
     Rahmen und Layout-Dichte ueber data-design am <html>-Element. */
  var DESIGNS = ['base', 'calm', 'calm-dark', 'editorial', 'neubrutalism'];
  var PRESETS = [
    {
      id: 'classic',
      name: 'Classic (Default)',
      values: {
        bg: '#f5f6f8', card: '#ffffff', ink: '#1c2733', muted: '#5b6b7b',
        accent: '#0f5c5c', accentDark: '#0a4242', accentInk: '#ffffff',
        bannerBg: '#0f5c5c',
        bannerInk: '#ffffff',
        warn: '#b3541e', warnBg: '#fdf1e7', warnBorder: '#ecc9a9',
        line: '#d8dee6', inputBg: '#fbfcfd', btnSecondaryBg: '#e7ebee',
        disclaimerBg: '#fff8e1', disclaimerBorder: '#e8d9a0', radius: 10
      }
    },
    {
      id: 'dark',
      name: 'Dark',
      values: {
        bg: '#14181d', card: '#1e242b', ink: '#e8edf3', muted: '#9fb0c0',
        accent: '#2fa4a4', accentDark: '#1f7d7d', accentInk: '#0d1117',
        bannerBg: '#173a3a',
        bannerInk: '#e8edf3',
        warn: '#ff9f5a', warnBg: '#2b1f16', warnBorder: '#5a3a22',
        line: '#34404d', inputBg: '#171d23', btnSecondaryBg: '#2a3440',
        disclaimerBg: '#2a2413', disclaimerBorder: '#54491f', radius: 10
      }
    },
    {
      id: 'high-contrast',
      name: 'High Contrast (a11y)',
      values: {
        bg: '#ffffff', card: '#ffffff', ink: '#000000', muted: '#333333',
        accent: '#004777', accentDark: '#002b49', accentInk: '#ffffff',
        bannerBg: '#000000',
        bannerInk: '#ffffff',
        warn: '#8a3b00', warnBg: '#ffffff', warnBorder: '#000000',
        line: '#000000', inputBg: '#ffffff', btnSecondaryBg: '#eeeeee',
        disclaimerBg: '#ffffff', disclaimerBorder: '#000000', radius: 0
      }
    },
    {
      id: 'warm',
      name: 'Warm',
      values: {
        bg: '#faf4ee', card: '#fffdf9', ink: '#33261b', muted: '#7a6a58',
        accent: '#9c4a1e', accentDark: '#7a3714', accentInk: '#ffffff',
        bannerBg: '#9c4a1e',
        bannerInk: '#ffffff',
        warn: '#a04a10', warnBg: '#fdefe2', warnBorder: '#e8c39e',
        line: '#e5d9c9', inputBg: '#fbf7f0', btnSecondaryBg: '#f0e6d8',
        disclaimerBg: '#fdf3d8', disclaimerBorder: '#e8d9a0', radius: 14
      }
    },
    {
      id: 'blue',
      name: 'Blue',
      values: {
        bg: '#eef3fb', card: '#ffffff', ink: '#16273d', muted: '#51677f',
        accent: '#1d4f91', accentDark: '#153a6c', accentInk: '#ffffff',
        bannerBg: '#1d4f91',
        bannerInk: '#ffffff',
        warn: '#b3541e', warnBg: '#fdf1e7', warnBorder: '#ecc9a9',
        line: '#c9d6e8', inputBg: '#f7fafd', btnSecondaryBg: '#dde7f4',
        disclaimerBg: '#fff8e1', disclaimerBorder: '#e8d9a0', radius: 10
      }
    },
    {
      id: 'calm',
      name: 'Calm',
      design: 'calm',
      values: {
        bg: '#fafafa', card: '#ffffff', ink: '#18181b', muted: '#71717a',
        accent: '#635bff', accentDark: '#4c46d4', accentInk: '#ffffff',
        bannerBg: '#fafafa',
        bannerInk: '#18181b',
        warn: '#b25000', warnBg: '#fff4e5', warnBorder: '#f0d9b8',
        line: '#e4e4e7', inputBg: '#ffffff', btnSecondaryBg: '#f4f4f5',
        disclaimerBg: '#fff8e1', disclaimerBorder: '#e8d9a0', radius: 8
      }
    },
    {
      id: 'calm-dark',
      name: 'Calm Dark',
      design: 'calm-dark',
      values: {
        bg: '#0b0b0d', card: '#131316', ink: '#f4f4f5', muted: '#9d9da8',
        accent: '#8b85ff', accentDark: '#a29dff', accentInk: '#0b0b0d',
        bannerBg: '#0b0b0d',
        bannerInk: '#f4f4f5',
        warn: '#f5b04c', warnBg: '#2a2114', warnBorder: '#57431f',
        line: '#26262b', inputBg: '#0e0e11', btnSecondaryBg: '#1b1b1f',
        disclaimerBg: '#16150d', disclaimerBorder: '#3c3a1f', radius: 8
      }
    },
    {
      id: 'neubrutalism',
      name: 'Neo-Brutalismus',
      design: 'neubrutalism',
      values: {
        bg: '#fdf6e3', card: '#ffffff', ink: '#111111', muted: '#4a4a4a',
        accent: '#ff5c00', accentDark: '#cc4a00', accentInk: '#111111',
        bannerBg: '#ffd41f',
        bannerInk: '#111111',
        warn: '#a30000', warnBg: '#ffe1e1', warnBorder: '#111111',
        line: '#111111', inputBg: '#fdf6e3', btnSecondaryBg: '#ffe9a8',
        disclaimerBg: '#ffffff', disclaimerBorder: '#111111', radius: 0
      }
    },
    {
      id: 'editorial',
      name: 'Editorial / Legal',
      design: 'editorial',
      values: {
        bg: '#f7f5f2', card: '#fffdfb', ink: '#232019', muted: '#6f6a5e',
        accent: '#1f3a5f', accentDark: '#16293f', accentInk: '#ffffff',
        bannerBg: '#f7f5f2',
        bannerInk: '#232019',
        warn: '#8a4b00', warnBg: '#f6efe2', warnBorder: '#d6c9a8',
        line: '#e6e1d8', inputBg: '#ffffff', btnSecondaryBg: '#efece6',
        disclaimerBg: '#eef2f6', disclaimerBorder: '#c7d3e0', radius: 6
      }
    }
  ];

  function designOfPreset(preset) {
    return (preset && DESIGNS.indexOf(preset.design) !== -1) ? preset.design : 'base';
  }

  function cssToToken(cssVar) {
    for (var key in TOKEN_TO_CSS) {
      if (Object.prototype.hasOwnProperty.call(TOKEN_TO_CSS, key) &&
          TOKEN_TO_CSS[key] === cssVar) {
        return key;
      }
    }
    return null;
  }

  function isValidColor(value) {
    return typeof value === 'string' && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value.trim());
  }

  function isValidRadius(value) {
    var n = parseFloat(value);
    return isFinite(n) && n >= 0 && n <= 40;
  }

  /**
   * Prüft und normalisiert einen Wertelader (Token -> Wert).
   * Unbekannte/ungültige Token werden verworfen; fehlende Token werden
   * aus dem Basis-Theme (Classic) ergänzt.
   */
  function sanitizeValues(values, base) {
    var baseValues = (base || PRESETS[0]).values;
    var out = {};
    var changed = false;
    TOKENS.forEach(function (token) {
      var v = values && values[token.key];
      if (v != null) {
        if (token.type === 'color') {
          if (isValidColor(v)) { out[token.key] = v.trim(); changed = true; return; }
        } else {
          var n = parseFloat(v);
          if (isFinite(n) && n >= 0 && n <= 40) { out[token.key] = n; changed = true; return; }
        }
      }
      out[token.key] = baseValues[token.key];
    });
    out.__customized = changed ? true : (values && values.__customized) || false;
    return out;
  }

  function isCustomized(values) {
    var base = PRESETS[0].values;
    return TOKENS.some(function (token) {
      return values[token.key] !== base[token.key];
    });
  }

  function applyToDocument(values) {
    if (typeof document === 'undefined') { return; }
    var root = document.documentElement;
    var sanitized = sanitizeValues(values);
    TOKENS.forEach(function (token) {
      root.style.setProperty(TOKEN_TO_CSS[token.key], String(sanitized[token.key]));
    });
    var design = 'base';
    if (values && values.__design && DESIGNS.indexOf(values.__design) !== -1) {
      design = values.__design;
    }
    root.setAttribute('data-design', design);
  }

  return {
    TOKENS: TOKENS,
    TOKEN_TO_CSS: TOKEN_TO_CSS,
    PRESETS: PRESETS,
    DESIGNS: DESIGNS,
    designOfPreset: designOfPreset,
    cssToToken: cssToToken,
    isValidColor: isValidColor,
    isValidRadius: isValidRadius,
    sanitizeValues: sanitizeValues,
    isCustomized: isCustomized,
    applyToDocument: applyToDocument
  };
})();

if (typeof module === 'object' && module.exports) {
  module.exports = AlimenCal.themes;
}
