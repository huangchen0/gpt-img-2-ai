import { ComponentType, lazy, Suspense } from 'react';

const iconCache: { [key: string]: ComponentType<any> } = {};
let lucideIconImportsPromise: Promise<
  typeof import('lucide-react/dynamicIconImports')
> | null = null;
let remixIconModulePromise: Promise<
  typeof import('./smart-icon-remix')
> | null = null;

// Function to automatically detect icon library
function detectIconLibrary(name: string): 'ri' | 'lucide' {
  if (name && name.startsWith('Ri')) {
    return 'ri';
  }

  return 'lucide';
}

function toLucideIconImportName(name: string) {
  return name
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase();
}

function logIconIssue(message: string) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn(message);
  }
}

async function getLucideIconImports() {
  if (!lucideIconImportsPromise) {
    lucideIconImportsPromise = import('lucide-react/dynamicIconImports');
  }

  return (await lucideIconImportsPromise).default;
}

async function getRemixIconModule() {
  if (!remixIconModulePromise) {
    remixIconModulePromise = import('./smart-icon-remix');
  }

  return remixIconModulePromise;
}

export function SmartIcon({
  name,
  size = 24,
  className,
  ...props
}: {
  name: string;
  size?: number;
  className?: string;
  [key: string]: any;
}) {
  const library = detectIconLibrary(name);
  const cacheKey = `${library}-${name}`;

  if (!iconCache[cacheKey]) {
    if (library === 'ri') {
      iconCache[cacheKey] = lazy(async () => {
        const { fallbackRemixIcon, remixIconMap } = await getRemixIconModule();
        const IconComponent =
          remixIconMap[name as keyof typeof remixIconMap] || fallbackRemixIcon;

        if (!(name in remixIconMap)) {
          logIconIssue(
            `Icon "${name}" not found in remix icon map, using fallback`
          );
        }

        return { default: IconComponent as ComponentType<any> };
      });
    } else {
      iconCache[cacheKey] = lazy(async () => {
        const lucideImports = await getLucideIconImports();
        const importName = toLucideIconImportName(name);
        const loadIcon =
          lucideImports[importName as keyof typeof lucideImports] ||
          lucideImports['help-circle'];

        try {
          if (!lucideImports[importName as keyof typeof lucideImports]) {
            logIconIssue(
              `Icon "${name}" not found in lucide dynamic imports, using fallback`
            );
          }

          const module = await loadIcon();
          return { default: module.default as ComponentType<any> };
        } catch (error) {
          logIconIssue(`Failed to load lucide icon "${name}", using fallback`);
          const fallbackModule = await lucideImports['help-circle']();
          return {
            default: fallbackModule.default as ComponentType<any>,
          };
        }
      });
    }
  }

  const IconComponent = iconCache[cacheKey];

  return (
    <Suspense
      fallback={
        <span
          aria-hidden="true"
          style={{ width: size, height: size }}
          className="inline-block"
        />
      }
    >
      <IconComponent size={size} className={className} {...props} />
    </Suspense>
  );
}
