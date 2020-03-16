#!/usr/bin/env node -r esm

import path from 'path';

import * as _ from 'lamb';
import yaml from 'js-yaml';
import {readDir, readFile, saveObj} from '@svizzle/file';
import {tapMessage} from '@svizzle/dev';
import {applyFnMap} from '@svizzle/utils';

const DATA_DIR = path.resolve(__dirname, '../../ds/data/processed');
const INDEX_PATH = path.resolve(__dirname, '../static/indicators.json');
const GITHUB_RAW_BASEPATH = 'https://raw.githubusercontent.com/nestauk/beis-indicators/dev/ds/data/processed';

const isDir = name => !name.startsWith('.') && path.parse(name).ext === '';
const isYaml = name => path.parse(name).ext === '.yaml';
const makePath = dirName => filename => path.resolve(
  DATA_DIR,
  dirName,
  filename
);
const makeCsvUrl = dirName => filename => {
  const {name} = path.parse(filename);

  return `${GITHUB_RAW_BASEPATH}/${dirName}/${name}.csv`;
}
const setUrl = url => obj => _.setIn(obj, 'url', url)
const saveIndex = saveObj(INDEX_PATH, 2);

const process = async () => {
  // FIXME use a proper walker
  const dirNames = await readDir(DATA_DIR).then(_.filterWith(isDir));
  const refs = await Promise.all(
    _.map(dirNames, dirName =>
      readDir(path.resolve(DATA_DIR, dirName))
      .then(_.pipe([
        _.filterWith(isYaml),
        _.mapWith(applyFnMap({
          filepath: makePath(dirName),
          url: makeCsvUrl(dirName),
        }))
      ]))
    )
  );
  const contents = await Promise.all(
    _.flatten(refs).map(({filepath, url}) =>
      readFile(filepath, 'utf-8')
      .then(yaml.safeLoad)
      .then(setUrl(url))
    )
  );

  await saveIndex(contents).then(tapMessage(`Saved ${INDEX_PATH}`));
}

process().then(tapMessage('Done'))
