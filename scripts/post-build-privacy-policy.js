import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 原始檔案：用來獲取 Git 最後修改時間
const sourcePath = path.resolve(__dirname, '../public/privacy-policy.html')
// 產出檔案：VitePress build 後的檔案 (參考 .vitepress/config.mts 的 outDir)
const distPath = path.resolve(__dirname, '../dist/privacy-policy.html')

try {
  // 檢查原始檔案是否存在
  if (!fs.existsSync(sourcePath)) {
    console.error('Source privacy policy file not found:', sourcePath)
    process.exit(1)
  }

  // 檢查產出檔案是否存在 (必須在 build 之後執行)
  if (!fs.existsSync(distPath)) {
    console.error(
      'Build output not found. Please run this script after "vitepress build". Path:',
      distPath,
    )
    // 不中斷流程，可能是在開發環境，或者該檔案尚未生成
    process.exit(1)
  }

  // 取得 git 最後修改日期 (基於原始檔案)
  let lastModifiedDate
  try {
    const checkGit = execSync(
      `git log -1 --format="%ad" --date=format:"%Y/%m/%d" "${sourcePath}"`,
      { encoding: 'utf-8' },
    ).trim()
    if (checkGit) {
      lastModifiedDate = checkGit
    }
  } catch (e) {
    console.warn(
      'Failed to get git date, using current date or file stats as fallback',
      e.message,
    )
  }

  if (!lastModifiedDate) {
    const stats = fs.statSync(sourcePath)
    const date = new Date(stats.mtime)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    lastModifiedDate = `${year}/${month}/${day}`
  }

  console.log(
    `Updating privacy policy date in distribution to: ${lastModifiedDate}`,
  )

  // 修改產出的檔案
  const content = fs.readFileSync(distPath, 'utf-8')

  // 替換日期的正則表達式，匹配 <p>最後更新日期： ...</p>
  const regex = /<p>最後更新日期：.*?<\/p>/

  if (regex.test(content)) {
    const newContent = content.replace(
      regex,
      `<p>最後更新日期： ${lastModifiedDate}</p>`,
    )

    if (newContent !== content) {
      fs.writeFileSync(distPath, newContent, 'utf-8')
      console.log('Privacy policy in dist updated successfully.')
    } else {
      console.log('Privacy policy date in dist is already up to date.')
    }
  } else {
    console.warn(
      'Could not find the date pattern in generated privacy policy file.',
    )
  }
} catch (error) {
  console.error('Error updating privacy policy:', error)
  process.exit(1)
}
