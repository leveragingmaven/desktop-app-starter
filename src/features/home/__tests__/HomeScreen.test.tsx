// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HomeScreen } from '../components/HomeScreen';

const navigateTo = vi.fn();
const setPreference = vi.fn(async () => {});
const showToast = vi.fn();
const writeText = vi.fn(async () => {});

vi.mock('@renderer/contexts/NavigationContext', () => ({
  useNavigation: () => ({ navigateTo }),
}));
vi.mock('@renderer/contexts/ThemeContext', () => ({
  useTheme: () => ({ preference: 'dark', resolved: 'dark', setPreference }),
}));
vi.mock('@renderer/contexts/ToastContext', () => ({
  useToast: () => ({ showToast }),
}));
vi.mock('@renderer/contexts/DialogContext', () => ({
  useConfirm: () => async () => true,
}));
vi.mock('@renderer/hooks/useAppInfo', () => ({
  useAppInfo: () => ({ name: 'Test App' }),
}));

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText },
    configurable: true,
  });
  (window as unknown as { api: unknown }).api = {};
});

function card(title: string): HTMLElement {
  return screen.getByRole('button', { name: new RegExp(title) });
}

describe('HomeScreen cards', () => {
  it('renders every dashboard card as a button', () => {
    render(<HomeScreen />);
    for (const title of [
      'A safe bridge',
      'Claude, ready to call',
      'Your files',
      'Settings and secrets',
      '21 components',
      'Motion',
      'Themes',
      'Generators',
      'CLAUDE.md',
      'Installers',
    ]) {
      expect(card(title).tagName).toBe('BUTTON');
    }
  });

  it('navigates to the existing screen for screen-linked cards', () => {
    render(<HomeScreen />);
    fireEvent.click(card('Claude, ready to call'));
    expect(navigateTo).toHaveBeenLastCalledWith('ai');
    fireEvent.click(card('Settings and secrets'));
    expect(navigateTo).toHaveBeenLastCalledWith('settings');
    fireEvent.click(card('21 components'));
    expect(navigateTo).toHaveBeenLastCalledWith('components');
  });

  it('runs a live bridge call when the bridge card is clicked', async () => {
    const appGetInfo = vi.fn(async () => ({ name: 'Test App', version: '1.2.3' }));
    (window as unknown as { api: unknown }).api = { appGetInfo };
    render(<HomeScreen />);
    fireEvent.click(card('A safe bridge'));
    await waitFor(() => expect(appGetInfo).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith('Bridge OK: Test App v1.2.3', 'success'),
    );
  });

  it('shows a working motion demo when the Motion card is clicked', () => {
    render(<HomeScreen />);
    expect(screen.queryByLabelText('Motion demo')).toBeNull();
    fireEvent.click(card('Motion'));
    expect(screen.getByLabelText('Motion demo')).toBeTruthy();
  });

  it('cycles the theme preference when the Themes card is clicked', async () => {
    render(<HomeScreen />);
    fireEvent.click(card('Themes'));
    // The mocked preference is 'dark', so the next theme in the cycle is 'slate'.
    await waitFor(() => expect(setPreference).toHaveBeenCalledWith('slate'));
  });

  it('copies a real command when the Generators card is clicked', async () => {
    render(<HomeScreen />);
    fireEvent.click(card('Generators'));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('npm run new:feature'));
    expect(showToast).toHaveBeenCalledWith('Copied: npm run new:feature', 'success');
  });

  it('activates a card from the keyboard (Enter)', () => {
    render(<HomeScreen />);
    const button = card('Claude, ready to call');
    button.focus();
    expect(document.activeElement).toBe(button);
    fireEvent.click(button);
    expect(navigateTo).toHaveBeenLastCalledWith('ai');
  });
});
