import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  clearLocalData,
  createSavedSearch,
  listGroups,
  listAllLoads,
  listLoads,
  listSavedSearches,
  openDatabase,
  saveParsedMessage,
  updateGroup,
  updateLoad,
  updateSavedSearch
} from '../src/server/db.mjs';
import { parseLoadMessage } from '../src/server/parser.mjs';

function withDb() {
  const dir = mkdtempSync(join(tmpdir(), 'loadhub-test-'));
  const db = openDatabase(join(dir, 'test.sqlite'));
  return {
    db,
    cleanup: () => {
      db.close();
      rmSync(dir, { recursive: true, force: true });
    }
  };
}

test('saves parsed message, deduplicates, updates group and edits load', () => {
  const { db, cleanup } = withDb();
  try {
    const message = {
      groupName: 'Demo curse',
      text: 'Arad - Germania 24t prelata 1200 EUR tel +40722111222',
      messageTime: '2026-06-16T08:00:00.000Z'
    };
    const first = saveParsedMessage(db, message, parseLoadMessage(message.text));
    const second = saveParsedMessage(db, message, parseLoadMessage(message.text));

    assert.equal(first.inserted, true);
    assert.equal(second.inserted, false);
    assert.equal(listLoads(db).length, 1);

    const group = listGroups(db)[0];
    const updatedGroup = updateGroup(db, group.id, { isActive: true });
    assert.equal(updatedGroup.isActive, true);

    const edited = updateLoad(db, first.load.id, { price: '1300 EUR', contact: 'Ion' });
    assert.equal(edited.price, '1300 EUR');
    assert.equal(edited.contact, 'Ion');
    assert.equal(edited.isManual, true);
  } finally {
    cleanup();
  }
});

test('stores analysis version without marking automatic reanalysis as manual', () => {
  const { db, cleanup } = withDb();
  try {
    const message = {
      groupName: 'Demo curse',
      text: 'Loc incar. - RO Brasov Loc desc. - MD Cahul prelata 23t',
      messageTime: '2026-06-16T08:00:00.000Z'
    };
    const saved = saveParsedMessage(db, message, parseLoadMessage(message.text));

    const reanalyzed = updateLoad(
      db,
      saved.load.id,
      { analysisVersion: 'test-analysis-v1', aiSummary: 'Brasov, Romania -> Cahul, Moldova' },
      { markManual: false }
    );

    assert.equal(reanalyzed.analysisVersion, 'test-analysis-v1');
    assert.equal(reanalyzed.isManual, false);
    assert.equal(listAllLoads(db).length, 1);
  } finally {
    cleanup();
  }
});

test('manages saved searches and clears local data', () => {
  const { db, cleanup } = withDb();
  try {
    const search = createSavedSearch(db, 'Arad Germania 24t');
    assert.equal(listSavedSearches(db).length, 1);
    const updatedSearch = updateSavedSearch(db, search.id, { query: 'Romania Moldova' });
    assert.equal(updatedSearch.query, 'Romania Moldova');
    clearLocalData(db);
    assert.equal(listSavedSearches(db).length, 0);
    assert.equal(listGroups(db).length, 0);
  } finally {
    cleanup();
  }
});
