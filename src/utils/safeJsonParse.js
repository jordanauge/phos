/*
 * Copyright (c) 2026 Jordan Auge
 *
 * This file is part of PHOS.
 *
 * PHOS is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * PHOS is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with PHOS.  If not, see <https://www.gnu.org/licenses/>.
 */

/**
 * Parse JSON while tolerating stray backslashes from pasted content.
 */
export function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch (error) {
    const sanitized = text
      .replace(/\\u(?![0-9a-fA-F]{4})/g, '\\\\u')
      .replace(/\\(?!["\\/bfnrtu])/g, '\\\\');
    if (sanitized === text) {
      throw error;
    }
    return JSON.parse(sanitized);
  }
}
