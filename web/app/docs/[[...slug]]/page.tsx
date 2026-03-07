import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { source, getPageImage } from '@/lib/source'

// Import PageLastUpdate along with other DocsPage components
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
  PageLastUpdate,
} from 'fumadocs-ui/layouts/docs/page'

// Import the GitHub utility to get last edit time
import { getGithubLastEdit } from 'fumadocs-core/content/github'

import { getMDXComponents } from '@/mdx-components'
import { createRelativeLink } from 'fumadocs-ui/mdx'
import { LLMCopyButton, ViewOptions } from '@/components/page-actions'

/**
 * GitHub repository configuration
 */
const GITHUB_OWNER = 'nsgpriyanshu'
const GITHUB_REPO = 'PriyoScript'
const GITHUB_BRANCH = 'main'

/**
 * Convert folder name → proper project display name
 */
function getProjectName(slug?: string[]) {
  const map: Record<string, string> = {
    nscore: 'nsCore',
    nstypocolors: 'nsTypoColors',
  }

  const key = slug?.[0]
  return (key && map[key]) || 'PriyoScript'
}

export default async function Page(props: PageProps<'/docs/[[...slug]]'>) {
  const params = await props.params
  const page = source.getPage(params.slug)

  if (!page) notFound()

  const MDX = page.data.body
  const markdownContent = await page.data.getText('processed')

  const lastModifiedTime = await getGithubLastEdit({
    owner: GITHUB_OWNER,
    repo: GITHUB_REPO,
    path: `web/content/docs/${page.path}`,
  })

  return (
    <DocsPage toc={page.data.toc} full={page.data.full}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
     <div className="flex flex-row gap-2 items-center border-b pt-2 pb-6">
        <LLMCopyButton markdownUrl={`${page.url}.mdx`} markdownContent={markdownContent} />
        <ViewOptions
          markdownUrl={`${page.url}.mdx`}
          githubUrl={`https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/blob/${GITHUB_BRANCH}/web/content/docs/${page.path}`}
        />
      </div>
      <DocsBody>
        <MDX
          components={getMDXComponents({
            a: createRelativeLink(source, page),
          })}
        />
      </DocsBody>

      {/* Display last updated timestamp */}
      {lastModifiedTime && <PageLastUpdate date={lastModifiedTime} />}
    </DocsPage>
  )
}

export async function generateStaticParams() {
  return source.generateParams()
}

export async function generateMetadata(
  props: PageProps<'/docs/[[...slug]]'>
): Promise<Metadata> {
  const params = await props.params
  const page = source.getPage(params.slug)

  if (!page) {
    return {
      title: 'Not Found',
      robots: { index: false, follow: false },
    }
  }

  const project = getProjectName(page.slugs)

  const description =
    page.data.description ??
    'A centralized documentation for the projects made by nsgpriyanshu'

  const image = {
    url: getPageImage(page).url,
    width: 1200,
    height: 630,
  }

  const title = `${page.data.title} – ${project}`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      url: `/docs/${page.slugs.join('/')}`,
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  }
}
