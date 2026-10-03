import { useI18n } from '../i18n';

const GITHUB_REPO_URL = 'https://github.com/jiang1997/context-port';

export function SiteFooter() {
  const { t } = useI18n();
  return (
    <footer className="site-footer">
      <span>© {new Date().getFullYear()} jiang1997 · ContextPort</span>
      <nav aria-label={t('@app.footer.navLabel')}>
        <a href="mailto:jieke@live.cn">jieke@live.cn</a>
        <a href={GITHUB_REPO_URL} target="_blank" rel="noreferrer">GitHub</a>
        <a href={`${GITHUB_REPO_URL}/blob/main/LICENSE`} target="_blank" rel="noreferrer">MIT License</a>
      </nav>
    </footer>
  );
}
