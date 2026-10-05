export const studioTransfer = {
  importTitle: 'Import a saved draft',
  importHelp:
    'Choose a Studio JSON export. Import creates a new draft in this notebook and leaves the original unchanged. No AI request is made.',
  importFile: 'Studio JSON file',
  importLimit: 'JSON files must be smaller than 1 MB.',
  importInvalid:
    'Choose a valid Studio JSON export with sections and source references.',
  importDestination: 'Import into {{notebook}}',
  importReview: 'Review the file before importing',
  importSnapshotHelp:
    'References retain the exported source snapshots. References outside this notebook will be marked as snapshots; importing does not verify their claims.',
  importAction: 'Import draft',
  importing: 'Importing…',
  importCancel: 'Cancel import',
  makeCopy: 'Make a copy',
  copying: 'Creating copy…',
  restoreHere: 'Restore a copy here',
  orphanNotice:
    'This draft came from a deleted notebook. You can export it or restore a copy into the selected notebook before editing.',
  snapshotNotice:
    'These references are saved snapshots. Compare them with the original evidence before using this draft.',
  opening: 'Opening draft…',
  transferFailed: 'The draft could not be opened or copied.'
}
