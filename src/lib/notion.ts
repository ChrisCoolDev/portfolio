import { Client } from '@notionhq/client'
import type {
  BlockObjectResponse,
  PageObjectResponse,
  RichTextItemResponse,
} from '@notionhq/client/build/src/api-endpoints'

// ─── Client ───────────────────────────────────────────────────────────────────

const notion = new Client({ auth: import.meta.env.NOTION_TOKEN })
const databaseId = import.meta.env.NOTION_DATABASE_ID

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Article {
  id: string
  title: string
  slug: string
  date: string
  dateFormatted: string
  tag: string
  excerpt: string
  cover: string
  readTime: number
}

export interface ArticleWithContent extends Article {
  content: string
  headings: { id: string; text: string; level: number }[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getRichText(property: any): string {
  if (!property?.rich_text?.length) return ''
  return property.rich_text.map((t: RichTextItemResponse) => t.plain_text).join('')
}

function getTitle(property: any): string {
  if (!property?.title?.length) return ''
  return property.title.map((t: RichTextItemResponse) => t.plain_text).join('')
}

function getSelect(property: any): string {
  return property?.select?.name ?? ''
}

function getDate(property: any): string {
  return property?.date?.start ?? ''
}

function getCheckbox(property: any): boolean {
  return property?.checkbox ?? false
}

function getNumber(property: any): number {
  return property?.number ?? 0
}

function getUrl(property: any): string {
  return property?.url ?? ''
}

/**
 * Formats a date string (YYYY-MM-DD) to French locale (e.g. "7 mars 2026")
 */
export function formatDateFr(dateStr: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/**
 * Generates a URL-safe slug from a heading text
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

// ─── Queries ──────────────────────────────────────────────────────────────────

function mapPageToArticle(page: PageObjectResponse): Article {
  const props = page.properties

  const dateStr = getDate(props.Date)

  return {
    id: page.id,
    title: getTitle(props.Title),
    slug: getRichText(props.Slug),
    date: dateStr,
    dateFormatted: formatDateFr(dateStr),
    tag: getSelect(props.Tag),
    excerpt: getRichText(props.Excerpt),
    cover: getUrl(props.Cover),
    readTime: getNumber(props.ReadTime),
  }
}

/**
 * Fetches all published articles, sorted by date descending
 */
export async function getPublishedArticles(): Promise<Article[]> {
  const response = await notion.databases.query({
    database_id: databaseId,
    filter: {
      property: 'Published',
      checkbox: { equals: true },
    },
    sorts: [
      { property: 'Date', direction: 'descending' },
    ],
  })

  return response.results
    .filter((page): page is PageObjectResponse => 'properties' in page)
    .map(mapPageToArticle)
}

/**
 * Fetches a single article by its slug
 */
export async function getArticleBySlug(slug: string): Promise<Article | null> {
  const response = await notion.databases.query({
    database_id: databaseId,
    filter: {
      and: [
        { property: 'Published', checkbox: { equals: true } },
        { property: 'Slug', rich_text: { equals: slug } },
      ],
    },
  })

  const page = response.results[0]
  if (!page || !('properties' in page)) return null

  return mapPageToArticle(page as PageObjectResponse)
}

/**
 * Fetches all blocks (content) for a given page, handling pagination
 */
async function getAllBlocks(pageId: string): Promise<BlockObjectResponse[]> {
  const blocks: BlockObjectResponse[] = []
  let cursor: string | undefined = undefined

  do {
    const response = await notion.blocks.children.list({
      block_id: pageId,
      start_cursor: cursor,
      page_size: 100,
    })

    blocks.push(
      ...response.results.filter(
        (block): block is BlockObjectResponse => 'type' in block,
      ),
    )

    cursor = response.has_more ? response.next_cursor ?? undefined : undefined
  } while (cursor)

  return blocks
}

/**
 * Fetches an article with its full rendered content
 */
export async function getArticleWithContent(slug: string): Promise<ArticleWithContent | null> {
  const article = await getArticleBySlug(slug)
  if (!article) return null

  const blocks = await getAllBlocks(article.id)
  const headings: ArticleWithContent['headings'] = []
  const content = await renderBlocks(blocks, headings)

  return { ...article, content, headings }
}

// ─── Block Renderer ───────────────────────────────────────────────────────────

/**
 * Renders Notion rich text to HTML with annotations (bold, italic, code, links, etc.)
 */
function renderRichText(richTexts: RichTextItemResponse[]): string {
  return richTexts
    .map((text) => {
      if (text.type !== 'text') return text.plain_text

      let html = escapeHtml(text.plain_text)

      // Apply annotations
      if (text.annotations.bold) html = `<strong>${html}</strong>`
      if (text.annotations.italic) html = `<em>${html}</em>`
      if (text.annotations.strikethrough) html = `<del>${html}</del>`
      if (text.annotations.underline) html = `<u>${html}</u>`
      if (text.annotations.code) html = `<code>${html}</code>`

      // Links
      if (text.text.link) {
        html = `<a href="${text.text.link.url}">${html}</a>`
      }

      return html
    })
    .join('')
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Renders an array of Notion blocks to HTML string.
 * Also collects headings for the table of contents.
 */
async function renderBlocks(
  blocks: BlockObjectResponse[],
  headings: ArticleWithContent['headings'],
): Promise<string> {
  const htmlParts: string[] = []
  let i = 0

  while (i < blocks.length) {
    const block = blocks[i]

    switch (block.type) {
      case 'paragraph': {
        const text = renderRichText(block.paragraph.rich_text)
        if (text) {
          htmlParts.push(`<p>${text}</p>`)
        }
        break
      }

      case 'heading_1': {
        const text = renderRichText(block.heading_1.rich_text)
        const plainText = block.heading_1.rich_text.map(t => t.plain_text).join('')
        const id = slugify(plainText)
        headings.push({ id, text: plainText, level: 1 })
        htmlParts.push(`<h2 id="${id}"><a id="${id}" href="#${id}" class="anchor" aria-hidden="true" title="Permalink"></a>${text}</h2>`)
        break
      }

      case 'heading_2': {
        const text = renderRichText(block.heading_2.rich_text)
        const plainText = block.heading_2.rich_text.map(t => t.plain_text).join('')
        const id = slugify(plainText)
        headings.push({ id, text: plainText, level: 2 })
        htmlParts.push(`<h3 id="${id}"><a id="${id}" href="#${id}" class="anchor" aria-hidden="true" title="Permalink"></a>${text}</h3>`)
        break
      }

      case 'heading_3': {
        const text = renderRichText(block.heading_3.rich_text)
        const plainText = block.heading_3.rich_text.map(t => t.plain_text).join('')
        const id = slugify(plainText)
        headings.push({ id, text: plainText, level: 3 })
        htmlParts.push(`<h4 id="${id}"><a id="${id}" href="#${id}" class="anchor" aria-hidden="true" title="Permalink"></a>${text}</h4>`)
        break
      }

      case 'bulleted_list_item': {
        // Collect consecutive bulleted list items
        const items: string[] = []
        while (i < blocks.length && blocks[i].type === 'bulleted_list_item') {
          const b = blocks[i] as BlockObjectResponse & { type: 'bulleted_list_item' }
          items.push(`<li>${renderRichText(b.bulleted_list_item.rich_text)}</li>`)
          i++
        }
        htmlParts.push(`<ul>${items.join('')}</ul>`)
        continue // skip the i++ at the end
      }

      case 'numbered_list_item': {
        const items: string[] = []
        while (i < blocks.length && blocks[i].type === 'numbered_list_item') {
          const b = blocks[i] as BlockObjectResponse & { type: 'numbered_list_item' }
          items.push(`<li>${renderRichText(b.numbered_list_item.rich_text)}</li>`)
          i++
        }
        htmlParts.push(`<ol>${items.join('')}</ol>`)
        continue
      }

      case 'code': {
        const code = block.code.rich_text.map(t => t.plain_text).join('')
        const lang = block.code.language || 'text'
        htmlParts.push(
          `<pre><code class="language-${lang}" data-lang="${lang}">${escapeHtml(code)}</code></pre>`,
        )
        break
      }

      case 'quote': {
        const text = renderRichText(block.quote.rich_text)
        htmlParts.push(`<blockquote><p>${text}</p></blockquote>`)
        break
      }

      case 'callout': {
        const text = renderRichText(block.callout.rich_text)
        const icon = block.callout.icon?.type === 'emoji' ? block.callout.icon.emoji : '💡'
        htmlParts.push(
          `<div class="callout"><span class="callout-icon">${icon}</span><div>${text}</div></div>`,
        )
        break
      }

      case 'divider': {
        htmlParts.push('<hr>')
        break
      }

      case 'image': {
        const src =
          block.image.type === 'external'
            ? block.image.external.url
            : block.image.file.url
        const caption = block.image.caption?.length
          ? renderRichText(block.image.caption)
          : ''
        htmlParts.push(
          `<figure><img src="${src}" alt="${caption || 'Article image'}" class="shadow-xl" />${caption ? `<figcaption>${caption}</figcaption>` : ''}</figure>`,
        )
        break
      }

      case 'table': {
        // Fetch table rows as children
        const rows = await notion.blocks.children.list({ block_id: block.id })
        const tableRows = rows.results.filter(
          (r): r is BlockObjectResponse & { type: 'table_row' } =>
            'type' in r && r.type === 'table_row',
        )

        let tableHtml = '<table>'
        tableRows.forEach((row, rowIndex) => {
          const tag = rowIndex === 0 && block.table.has_column_header ? 'th' : 'td'
          const wrapper = rowIndex === 0 && block.table.has_column_header ? 'thead' : ''

          if (wrapper === 'thead') tableHtml += '<thead>'
          if (rowIndex === 1 && block.table.has_column_header) tableHtml += '<tbody>'

          tableHtml += '<tr>'
          row.table_row.cells.forEach((cell) => {
            tableHtml += `<${tag}>${renderRichText(cell as RichTextItemResponse[])}</${tag}>`
          })
          tableHtml += '</tr>'

          if (wrapper === 'thead') tableHtml += '</thead>'
        })

        if (block.table.has_column_header && tableRows.length > 1) {
          tableHtml += '</tbody>'
        }
        tableHtml += '</table>'
        htmlParts.push(tableHtml)
        break
      }

      case 'toggle': {
        const summary = renderRichText(block.toggle.rich_text)
        // Fetch children of toggle
        const children = await notion.blocks.children.list({ block_id: block.id })
        const childBlocks = children.results.filter(
          (b): b is BlockObjectResponse => 'type' in b,
        )
        const childContent = await renderBlocks(childBlocks, headings)
        htmlParts.push(
          `<details><summary>${summary}</summary>${childContent}</details>`,
        )
        break
      }

      case 'bookmark': {
        const url = block.bookmark.url
        const caption = block.bookmark.caption?.length
          ? renderRichText(block.bookmark.caption)
          : url
        htmlParts.push(`<p><a href="${url}">${caption}</a></p>`)
        break
      }

      case 'video': {
        const videoUrl =
          block.video.type === 'external'
            ? block.video.external.url
            : block.video.file?.url ?? ''
        if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
          const videoId = videoUrl.includes('youtu.be')
            ? videoUrl.split('/').pop()
            : new URL(videoUrl).searchParams.get('v')
          htmlParts.push(
            `<div class="aspect-w-16 aspect-h-9"><iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`,
          )
        } else {
          htmlParts.push(`<video src="${videoUrl}" controls class="w-full"></video>`)
        }
        break
      }

      default:
        // Unsupported block type — skip silently
        break
    }

    i++
  }

  return htmlParts.join('\n')
}
