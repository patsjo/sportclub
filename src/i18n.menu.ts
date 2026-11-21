/** Translations for the order of the menu, merged into i18n.resources.ts */

export const menuSv = {
  MenuOrder: 'Menyordning',
  MenuOrderInfo:
    'Dra menypunkterna i den ordning de ska visas i menyn, ordningen gäller för alla. Nya menypunkter läggs in där de står i standardordningen.',
  Divider: 'Avdelare',
  AddDivider: 'Lägg till avdelare',
  Delete: 'Ta bort',
  MoveUp: 'Flytta upp',
  MoveDown: 'Flytta ned',
  DragHandle: 'Dra för att flytta {{name}}',
  DefaultOrder: 'Återställ standardordning',
  DefaultOrderInfo: 'Standardordningen används, ingen ordning är sparad.',
  Saved: 'Menyordningen är sparad och gäller nu för alla.',
  SaveFailed: 'Kunde inte spara menyordningen ({{url}}): {{error}}',
  Unsaved: 'Ändringarna är inte sparade.',
  OnlyAdmin: 'Bara administratörer kan ändra menyordningen.',
  NotConfigured:
    'Menyordningen är inte inställd för klubben (settings i klubbens konfiguration), menyn visas i standardordningen.'
};

export const menuEn: typeof menuSv = {
  MenuOrder: 'Menu order',
  MenuOrderInfo:
    'Drag the menu items in the order they shall be shown in the menu, the order is the same for everyone. New menu items are put where they are in the default order.',
  Divider: 'Divider',
  AddDivider: 'Add divider',
  Delete: 'Delete',
  MoveUp: 'Move up',
  MoveDown: 'Move down',
  DragHandle: 'Drag to move {{name}}',
  DefaultOrder: 'Reset to default order',
  DefaultOrderInfo: 'The default order is used, no order is saved.',
  Saved: 'The menu order is saved and is now used for everyone.',
  SaveFailed: 'The menu order could not be saved ({{url}}): {{error}}',
  Unsaved: 'The changes are not saved.',
  OnlyAdmin: 'Only administrators can change the menu order.',
  NotConfigured:
    'The menu order is not set up for the club (settings in the club config), the menu is shown in the default order.'
};
