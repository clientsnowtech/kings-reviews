import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseCsv, csvRecords, csvList } from './csv'

test('keeps commas and newlines that live inside quotes', () => {
  const rows = parseCsv('name,address\nSpice Villa,"12 MG Road, Ward 4"\nSunrise,"Shop 3\nStation Road"')
  assert.deepEqual(rows[1], ['Spice Villa', '12 MG Road, Ward 4'])
  assert.deepEqual(rows[2], ['Sunrise', 'Shop 3\nStation Road'])
})

test('unescapes doubled quotes and survives CRLF and a BOM', () => {
  const rows = parseCsv('﻿name,tagline\r\nAcme,"He said ""hi"""\r\n')
  assert.deepEqual(rows, [
    ['name', 'tagline'],
    ['Acme', 'He said "hi"'],
  ])
})

test('drops blank padding rows an export leaves behind', () => {
  assert.equal(parseCsv('a,b\n1,2\n,\n\n').length, 2)
})

test('matches headers loosely and reports the line as Excel numbers it', () => {
  const { records } = csvRecords(parseCsv('Business Name,Founded Year\n Acme , 2010 '))
  assert.equal(records[0].line, 2)
  assert.equal(records[0].get('name', 'business name'), 'Acme')
  assert.equal(records[0].get('founded_year'), '2010')
  assert.equal(records[0].get('missing'), '')
})

test('a header with no data rows yields no records', () => {
  assert.deepEqual(csvRecords(parseCsv('name,city')).records, [])
})

test('splits multi-value cells on | and ;', () => {
  assert.deepEqual(csvList('Cafe| Bakery ;Coffee shop'), ['Cafe', 'Bakery', 'Coffee shop'])
  assert.deepEqual(csvList(''), [])
})
