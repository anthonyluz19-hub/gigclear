import { renderToString } from 'react-dom/server';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';
import Landing from './components/Landing';

const noop = () => {};

export function render({ lang = 'en' } = {}) {
  if (i18n.language !== lang) {
    i18n.changeLanguage(lang);
  }
  return renderToString(
    <I18nextProvider i18n={i18n}>
      <Landing
        onStart={noop}
        theme="dark"
        onToggleTheme={noop}
        onToggleLang={noop}
        lang={lang}
      />
    </I18nextProvider>
  );
}
