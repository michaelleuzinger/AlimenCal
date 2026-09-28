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

  var PRESETS = [
    {
      id: 'classic',
      name: 'Classic (Default)',
      values: {
        bg: '#f5f6f8', card: '#ffffff', ink: '#1c2733', muted: '#5b6b7b',
        accent: '#0f5c5c', accentDark: '#0a4242', accentInk: '#ffffff',
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
        warn: '#b3541e', warnBg: '#fdf1e7', warnBorder: '#ecc9a9',
        line: '#c9d6e8', inputBg: '#f7fafd', btnSecondaryBg: '#dde7f4',
        disclaimerBg: '#fff8e1', disclaimerBorder: '#e8d9a0', radius: 10
      }
    }
  ];

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
  }

  return {
    TOKENS: TOKENS,
    TOKEN_TO_CSS: TOKEN_TO_CSS,
    PRESETS: PRESETS,
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
