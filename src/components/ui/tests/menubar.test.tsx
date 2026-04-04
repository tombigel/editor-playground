import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  closeMenubarSession,
  createClosedMenubarSession,
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarGroupLabel,
  MenubarItem,
  MenubarMenu,
  MenubarPanelLinkItem,
  MenubarSeparator,
  MenubarSubmenu,
  MenubarToggleWithMoreItem,
  MenubarTrigger,
  openMenubarSession,
} from '../menubar';

describe('components/ui/menubar', () => {
  it('uses an explicit top-level session state machine for click-then-hover behavior', () => {
    const closed = createClosedMenubarSession();

    expect(closed).toEqual({
      activeMenuId: null,
      hoverNavigationEnabled: false,
    });

    const ignoredHover = openMenubarSession(closed, 'view', { viaHover: true });
    expect(ignoredHover).toEqual(closed);

    const openedByClick = openMenubarSession(closed, 'settings');
    expect(openedByClick).toEqual({
      activeMenuId: 'settings',
      hoverNavigationEnabled: true,
    });

    const switchedByHover = openMenubarSession(openedByClick, 'view', { viaHover: true });
    expect(switchedByHover).toEqual({
      activeMenuId: 'view',
      hoverNavigationEnabled: true,
    });

    expect(closeMenubarSession()).toEqual(closed);
  });

  it('renders reusable menu primitives for actions, toggles, submenus, links, and shortcuts', () => {
    const markup = renderToStaticMarkup(
      <Menubar>
        <MenubarMenu id="view">
          <MenubarTrigger>View</MenubarTrigger>
          <MenubarContent>
            <MenubarItem shortcut="Shift + G">Show grid</MenubarItem>
            <MenubarCheckboxItem checked onCheckedChange={() => {}} shortcut="Shift + P">
              Sticky preview
            </MenubarCheckboxItem>
            <MenubarToggleWithMoreItem checked={false} onCheckedChange={() => {}} onMore={() => {}}>
              Snap
            </MenubarToggleWithMoreItem>
            <MenubarSeparator />
            <MenubarGroupLabel>Light</MenubarGroupLabel>
            <MenubarSubmenu label="Theme">
              <MenubarItem selected>Air</MenubarItem>
            </MenubarSubmenu>
            <MenubarPanelLinkItem>Layers panel</MenubarPanelLinkItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>,
    );

    expect(markup).toContain('data-ui="menubar"');
    expect(markup).toContain('data-ui="menubar-trigger"');
    expect(markup).toContain('data-ui="menubar-item"');
    expect(markup).toContain('data-ui="menubar-shortcut"');
    expect(markup).toContain('role="menuitemcheckbox"');
    expect(markup).toContain('editor-menubar-toggle-more-row');
    expect(markup).toContain('editor-menubar-group-label');
    expect(markup).toContain('Shift + P');
    expect(markup).toContain('Layers panel');
  });
});
