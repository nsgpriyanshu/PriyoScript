import { DocsLayout } from 'fumadocs-ui/layouts/docs'
import { source } from '@/lib/source'
import { baseOptions } from '@/lib/layout.shared'
import type { CSSProperties, ReactNode } from 'react'

export default function DocsLayoutRoot({ children }: { children: ReactNode }) {
  const base = baseOptions()

  return (
    <DocsLayout
      {...base}
      tree={source.pageTree}
      sidebar={{
        tabs: {
          transform(option, node) {
            const meta = source.getNodeMeta(node)
            if (!meta || !node.icon) return option

            // category selection color based on path src/styles/base.css
            const color = `var(--${meta.path.split('/')[0]}-color, var(--color-fd-foreground))`

            return {
              ...option,
              icon: (
                <div
                  className="size-full rounded-lg text-(--tab-color) max-md:border max-md:bg-(--tab-color)/10 max-md:p-1.5 [&_svg]:size-full"
                  style={
                    {
                      '--tab-color': color,
                    } as CSSProperties
                  }
                >
                  {node.icon}
                </div>
              ),
            }
          },
        },
      }}
    >
      {children}
    </DocsLayout>
  )
}