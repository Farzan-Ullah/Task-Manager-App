/**
 * LexoRank Utility for Fractional Indexing
 * Generates lexicographically orderable rank strings (e.g. "0|h00000:", "0|h00001:")
 * Supports collision-free insertion between two existing ranks without re-indexing.
 */

const BASE_CHARSET = "0123456789abcdefghijklmnopqrstuvwxyz";
const MID_CHAR = "m";
const MIN_CHAR = "0";
const MAX_CHAR = "z";
const DEFAULT_BUCKET = "0|";

function getCharIndex(c) {
  const idx = BASE_CHARSET.indexOf(c);
  return idx === -1 ? 0 : idx;
}

/**
 * Generate an initial rank for an index
 * @param {number} index - 0-indexed position
 * @returns {string} - LexoRank string
 */
function initialRank(index = 0) {
  // Pad with leading zeros in base36: e.g. "0|h00000:"
  const offset = 1000 + index * 16;
  const base36 = offset.toString(36).padStart(6, "0");
  return `${DEFAULT_BUCKET}${base36}:`;
}

/**
 * Generate a rank strictly between prevRank and nextRank
 * @param {string|null} prevRank
 * @param {string|null} nextRank
 * @returns {string}
 */
function between(prevRank, nextRank) {
  if (!prevRank && !nextRank) {
    return initialRank(0);
  }

  // If only nextRank exists, generate a rank before nextRank
  if (!prevRank && nextRank) {
    const raw = nextRank.replace(/^[0-9]+\|/, "").replace(/:$/, "");
    let result = "";
    let borrowed = false;
    for (let i = 0; i < raw.length; i++) {
      const idx = getCharIndex(raw[i]);
      if (idx > 1 && !borrowed) {
        result += BASE_CHARSET[Math.floor(idx / 2)];
        borrowed = true;
      } else if (borrowed) {
        result += MID_CHAR;
      } else {
        result += MIN_CHAR;
      }
    }
    if (!borrowed) {
      result = MIN_CHAR + result;
    }
    return `${DEFAULT_BUCKET}${result}:`;
  }

  // If only prevRank exists, generate a rank after prevRank
  if (prevRank && !nextRank) {
    const raw = prevRank.replace(/^[0-9]+\|/, "").replace(/:$/, "");
    // Increment the last character or append mid character
    const lastChar = raw[raw.length - 1];
    const lastIdx = getCharIndex(lastChar);
    if (lastIdx < BASE_CHARSET.length - 1) {
      const newChar = BASE_CHARSET[Math.min(BASE_CHARSET.length - 1, lastIdx + 2)];
      return `${DEFAULT_BUCKET}${raw.slice(0, -1)}${newChar}:`;
    }
    return `${DEFAULT_BUCKET}${raw}${MID_CHAR}:`;
  }

  // Both exist: find midpoint
  const prevRaw = prevRank.replace(/^[0-9]+\|/, "").replace(/:$/, "");
  const nextRaw = nextRank.replace(/^[0-9]+\|/, "").replace(/:$/, "");

  let p = 0;
  while (p < prevRaw.length && p < nextRaw.length && prevRaw[p] === nextRaw[p]) {
    p++;
  }

  const prefix = prevRaw.substring(0, p);
  const pChar = p < prevRaw.length ? prevRaw[p] : MIN_CHAR;
  const nChar = p < nextRaw.length ? nextRaw[p] : MAX_CHAR;

  const pIdx = getCharIndex(pChar);
  const nIdx = getCharIndex(nChar);

  if (nIdx - pIdx > 1) {
    const midIdx = Math.floor((pIdx + nIdx) / 2);
    return `${DEFAULT_BUCKET}${prefix}${BASE_CHARSET[midIdx]}:`;
  }

  // Adjacent characters, e.g. 'a' and 'b': append midpoint to prev remainder
  let remainder = prevRaw.substring(p + 1);
  if (!remainder) {
    return `${DEFAULT_BUCKET}${prevRaw}${MID_CHAR}:`;
  }

  // Find midpoint in remainder
  return `${DEFAULT_BUCKET}${prevRaw}${MID_CHAR}:`;
}

module.exports = {
  initialRank,
  between,
};
