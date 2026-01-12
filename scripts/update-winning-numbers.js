/* global fetch, setTimeout */
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import * as cheerio from 'cheerio'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const LIST_URL = 'https://www.etax.nat.gov.tw/etwmain/etw183w'
const DETAIL_URL_TEMPLATE =
  'https://www.etax.nat.gov.tw/etw-main/ETW183W2_{period}/'
const JSON_PATH = path.resolve(__dirname, '../public/winning-numbers.json')
const MAX_RETRIES = 3
const RETRY_DELAY = 2000 // 2 秒

// 工具函數: 延遲
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

// 工具函數: 帶重試的 fetch
async function fetchWithRetry(url, retries = MAX_RETRIES) {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`Fetching: ${url} (attempt ${i + 1}/${retries})`)
      const response = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; Invoice-Checker-Bot/1.0; +https://github.com/kakahikari/tw-invoice-checker-web)',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return await response.text()
    } catch (error) {
      console.error(
        `Fetch failed (attempt ${i + 1}/${retries}):`,
        error.message,
      )
      if (i < retries - 1) {
        console.log(`Retrying in ${RETRY_DELAY / 1000} seconds...`)
        await delay(RETRY_DELAY)
      } else {
        throw error
      }
    }
  }
}

// Step 1: 讀取現有資料
function loadExistingData() {
  try {
    if (!fs.existsSync(JSON_PATH)) {
      console.log('No existing data found, will create new file')
      return { updateTime: '', periods: [] }
    }

    const data = JSON.parse(fs.readFileSync(JSON_PATH, 'utf-8'))
    console.log(
      `Loaded existing data: ${data.periods.length} period(s), latest: ${data.periods[0]?.period || 'N/A'}`,
    )
    return data
  } catch (error) {
    console.error('Error loading existing data:', error)
    return { updateTime: '', periods: [] }
  }
}

// Step 2: 抓取列表頁面並取得最近兩期
async function fetchRecentPeriods() {
  const html = await fetchWithRetry(LIST_URL)
  const $ = cheerio.load(html)

  // 尋找所有符合 "XX年 XX ~ XX 月" 格式的連結
  const periodLinks = []
  $('a').each((_, el) => {
    const text = $(el).text().trim()
    const href = $(el).attr('href')

    // 匹配格式: "114年 09 ~ 10 月" 或 "114年 9 ~ 10 月"
    const match = text.match(/^(\d{3})年\s+(\d{1,2})\s+~\s+(\d{1,2})\s*月$/)
    if (match && href) {
      // 從 URL 提取期別: /etw-main/ETW183W2_11409/ -> 11409
      const periodMatch = href.match(/ETW183W2_(\d{5})/)
      if (periodMatch) {
        periodLinks.push({
          period: periodMatch[1],
          year: match[1],
          startMonth: match[2],
          endMonth: match[3],
          url: href,
        })
      }
    }
  })

  if (periodLinks.length === 0) {
    throw new Error('No period links found on the list page')
  }

  // 排序取最新 (期別數字最大)
  periodLinks.sort((a, b) => b.period.localeCompare(a.period))

  // 取最近兩期
  const recent = periodLinks.slice(0, 2)

  console.log(`Recent periods found: ${recent.map(p => p.period).join(', ')}`)
  return recent
}

// Step 3: 抓取詳細頁面
async function fetchPeriodDetails(period) {
  const url = DETAIL_URL_TEMPLATE.replace('{period}', period)
  const html = await fetchWithRetry(url)
  const $ = cheerio.load(html)

  // 解析年月份
  const yearMonthText = $('body')
    .find('*')
    .filter(function () {
      return (
        $(this)
          .contents()
          .filter(function () {
            return (
              this.type === 'text' &&
              $(this)
                .text()
                .trim()
                .match(/^\d{3}年\s+\d{1,2}\s+~\s+\d{1,2}\s*月$/)
            )
          }).length > 0
      )
    })
    .first()
    .text()
    .trim()

  const yearMonthMatch = yearMonthText.match(
    /^(\d{3})年\s+(\d{1,2})\s+~\s+(\d{1,2})\s*月$/,
  )
  if (!yearMonthMatch) {
    throw new Error(`Cannot parse year/month: ${yearMonthText}`)
  }

  const year = `${yearMonthMatch[1]}年`
  const months = `${yearMonthMatch[2]}-${yearMonthMatch[3]}月`

  // 解析特別獎
  let specialPrize = ''
  $('body')
    .find('*')
    .each((_, el) => {
      const text = $(el).text().trim()
      if (text === '特別獎') {
        specialPrize = $(el)
          .parent()
          .find('*')
          .filter(function () {
            return (
              $(this)
                .contents()
                .filter(function () {
                  return (
                    this.type === 'text' &&
                    $(this)
                      .text()
                      .trim()
                      .match(/^\d{8}$/)
                  )
                }).length > 0
            )
          })
          .first()
          .text()
          .trim()
        return false
      }
    })

  // 解析特獎
  let grandPrize = ''
  $('body')
    .find('*')
    .each((_, el) => {
      const text = $(el).text().trim()
      if (text === '特獎') {
        grandPrize = $(el)
          .parent()
          .find('*')
          .filter(function () {
            return (
              $(this)
                .contents()
                .filter(function () {
                  return (
                    this.type === 'text' &&
                    $(this)
                      .text()
                      .trim()
                      .match(/^\d{8}$/)
                  )
                }).length > 0
            )
          })
          .first()
          .text()
          .trim()
        return false
      }
    })

  // 解析頭獎 (3 組)
  const firstPrize = []
  $('body')
    .find('*')
    .each((_, el) => {
      const text = $(el).text().trim()
      if (text === '頭獎') {
        $(el)
          .parent()
          .find('*')
          .each((_, numEl) => {
            const numText = $(numEl).text().trim()
            if (numText.match(/^\d{8}$/) && !firstPrize.includes(numText)) {
              firstPrize.push(numText)
            }
          })
        return false
      }
    })

  // 解析兌獎期限 (從領獎注意事項第一點)
  let redemptionDate = ''
  $('body')
    .find('*')
    .each((_, el) => {
      const text = $(el).text().trim()
      // 匹配: "1.領獎期間自114年12月6日起至115年3月5日止"
      const match = text.match(
        /領獎期間自(\d{3})年(\d{1,2})月(\d{1,2})日起至(\d{3})年(\d{1,2})月(\d{1,2})日止/,
      )
      if (match) {
        const startYear = parseInt(match[1]) + 1911
        const startMonth = match[2].padStart(2, '0')
        const startDay = match[3].padStart(2, '0')
        const endYear = parseInt(match[4]) + 1911
        const endMonth = match[5].padStart(2, '0')
        const endDay = match[6].padStart(2, '0')
        redemptionDate = `${startYear}-${startMonth}-${startDay} ~ ${endYear}-${endMonth}-${endDay}`
        return false
      }
    })

  // 驗證必要欄位
  if (
    !specialPrize ||
    !grandPrize ||
    firstPrize.length !== 3 ||
    !redemptionDate
  ) {
    throw new Error(
      `Missing required fields: specialPrize=${!!specialPrize}, grandPrize=${!!grandPrize}, firstPrize=${firstPrize.length}, redemptionDate=${!!redemptionDate}`,
    )
  }

  console.log(`Parsed period ${period}: ${year} ${months}`)
  return {
    period,
    months,
    year,
    redemptionDate,
    specialPrize,
    grandPrize,
    firstPrize,
    additionalSixthPrize: [], // 目前無增開六獎資料
  }
}

// Step 4: 更新 JSON 檔案
function updateJSON(existingData, newPeriods) {
  // 比對內容是否變更 (忽略 updateTime)
  const currentPeriodsJson = JSON.stringify(existingData.periods)
  const newPeriodsJson = JSON.stringify(newPeriods)

  if (currentPeriodsJson === newPeriodsJson) {
    console.log('Data is identical to existing record. No update needed.')
    return false
  }

  // 使用台灣時間格式化
  const now = new Date()
  const formatter = new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })

  // 格式化為 YYYY-MM-DD HH:mm:ss
  const parts = formatter.formatToParts(now)
  const getPart = type => parts.find(p => p.type === type).value
  const updateTime = `${getPart('year')}-${getPart('month')}-${getPart('day')} ${getPart('hour')}:${getPart('minute')}:${getPart('second')}`

  const updatedData = {
    updateTime,
    periods: newPeriods,
  }

  fs.writeFileSync(
    JSON_PATH,
    JSON.stringify(updatedData, null, 2) + '\n',
    'utf-8',
  )
  console.log(
    `Updated ${JSON_PATH} with periods: ${newPeriods
      .map(p => p.period)
      .join(', ')}`,
  )
  return true
}

// Step 5: Git 自動提交
function gitCommitAndPush(periods) {
  try {
    // 檢查是否有變更
    const status = execSync(
      'git status --porcelain public/winning-numbers.json',
      {
        encoding: 'utf-8',
      },
    ).trim()

    if (!status) {
      console.log('No changes to commit')
      return
    }

    console.log('Changes detected, committing...')

    // 配置 git (GitHub Actions 環境)
    execSync('git config user.name "github-actions[bot]"')
    execSync(
      'git config user.email "github-actions[bot]@users.noreply.github.com"',
    )

    // Add, commit, push
    execSync('git add public/winning-numbers.json')
    const periodsStr = periods.map(p => p.period).join(', ')
    execSync(
      `git commit -m "chore: update winning numbers for periods ${periodsStr}"`,
    )
    execSync('git push')

    console.log(
      `Successfully committed and pushed changes for periods ${periodsStr}`,
    )
  } catch (error) {
    console.error('Git operation failed:', error.message)
    throw error
  }
}

// 主函數
async function main() {
  try {
    console.log('=== Starting winning numbers update ===')

    // Step 1: 讀取現有資料
    const existingData = loadExistingData()

    // Step 2: 取得最近兩期
    const recentPeriodsMetadata = await fetchRecentPeriods()

    // Step 3: 抓取詳細資料
    const newPeriodsData = []
    for (const metadata of recentPeriodsMetadata) {
      console.log(`Processing period ${metadata.period}...`)
      const details = await fetchPeriodDetails(metadata.period)
      newPeriodsData.push(details)
      // 稍微延遲避免請求過快
      await delay(1000)
    }

    // Step 4: 更新 JSON
    const isUpdated = updateJSON(existingData, newPeriodsData)

    if (!isUpdated) {
      console.log('=== No content changes detected ===')
      return
    }

    // Step 5: Git 提交 (僅在 CI 環境)
    if (process.env.CI) {
      gitCommitAndPush(newPeriodsData)
    } else {
      console.log('Not in CI environment, skipping git operations')
    }

    console.log('=== Update completed successfully ===')
  } catch (error) {
    console.error('=== Update failed ===')
    console.error(error)
    process.exit(1)
  }
}

main()
