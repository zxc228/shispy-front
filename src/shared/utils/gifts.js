/**
 * Utility functions for working with gift TGS stickers from S3
 */

import { logger } from '../logger'

// S3 base URL и путь настраиваются через ENV (vite)
// ВАЖНО: ключи AWS на фронте не нужны и не должны использоваться
// Если VITE_S3_GIFTS_URL пустая строка — используем относительный путь (same-origin)
const RAW_BASE = (import.meta.env.VITE_S3_GIFTS_URL ?? '').trim()
// По умолчанию ждём nginx-прокси на /tgs в проде; в деве можно прописать полный путь
const RAW_PATH = (import.meta.env.VITE_S3_GIFTS_PATH ?? '/tgs').trim()

// Нормализуем BASE и PATH, чтобы избежать двойных/пропавших слешей
const S3_BASE_URL = RAW_BASE ? RAW_BASE.replace(/\/$/, '') : ''
const S3_GIFTS_PATH = RAW_PATH?.startsWith('/') ? RAW_PATH : `/${RAW_PATH || ''}`

/**
 * Get S3 URL for a gift TGS sticker by slug
 * @param {string} slug - Gift slug identifier
 * @returns {string} Full S3 URL to the .tgs file
 */
export function getGiftTgsUrl(slug) {
  if (!slug || typeof slug !== 'string') {
    logger.warn('getGiftTgsUrl: invalid slug', { slug })
    return null
  }
  // Если бэкенд сразу прислал абсолютный URL — используем его как есть
  if (/^https?:\/\//i.test(slug)) {
    logger.debug('getGiftTgsUrl: passthrough absolute URL from slug', { slug })
    return slug
  }
  
  // Remove .tgs extension if it was already added
  const cleanSlug = slug.endsWith('.tgs') ? slug.slice(0, -4) : slug
  
  const url = `${S3_BASE_URL}${S3_GIFTS_PATH}/${cleanSlug}.tgs`
  logger.debug('getGiftTgsUrl: generated URL', { slug: cleanSlug, url, S3_BASE_URL, S3_GIFTS_PATH })
  
  return url
}

/**
 * Transform gift data from API to UI format
 * @param {Object} gift - Gift object from API { gid, value, slug }
 * @returns {Object} UI-ready gift object
 */
export function transformGiftData(gift) {
  const transformed = {
    id: gift.gid,
    gid: gift.gid,
    slug: gift.slug,
    value: Number(gift.value ?? 0),
    tgsUrl: getGiftTgsUrl(gift.slug)
  }
  logger.debug('gifts: transform one', { input: gift, output: transformed })
  return transformed
}

/**
 * Transform array of gifts from API to UI format
 * @param {Array} gifts - Array of gift objects from API
 * @returns {Array} Array of UI-ready gift objects
 */
export function transformGiftsData(gifts) {
  if (!Array.isArray(gifts)) return []
  return gifts.map(transformGiftData)
}

export default {
  getGiftTgsUrl,
  transformGiftData,
  transformGiftsData
}
