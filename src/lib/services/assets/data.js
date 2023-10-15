import { get } from 'svelte/store';
import { allAssetPaths, allAssets, getAssetKind } from '$lib/services/assets';
import { backend } from '$lib/services/backends';
import { getHash, renameIfNeeded } from '$lib/services/utils/files';
import { escapeRegExp } from '$lib/services/utils/strings';

/**
 * Upload/save the given assets to the backend.
 * @param {UploadingAssets} uploadingAssets Assets to be uploaded.
 * @param {object} [options] Options for the backend handler.
 */
export const saveAssets = async ({ files, folder }, options) => {
  const assetNamesInSameFolder = get(allAssets)
    .map((a) => a.path)
    .filter((p) => p.match(`^${escapeRegExp(folder)}\\/[^\\/]+$`))
    .map((p) => p.split('/').pop());

  const savingFileList = files.map((file) => {
    const name = renameIfNeeded(file.name, assetNamesInSameFolder);
    const path = [folder, name].join('/');

    assetNamesInSameFolder.push(name);

    return { name, path, file };
  });

  await get(backend).saveFiles(
    savingFileList.map(({ path, file }) => ({ path, data: file })),
    options,
  );

  const { collectionName = null } =
    get(allAssetPaths).findLast(({ internalPath }) => folder === internalPath) || {};

  /**
   * @type {Asset[]}
   */
  const newAssets = await Promise.all(
    savingFileList.map(async ({ name, path, file }) => ({
      url: URL.createObjectURL(file),
      name,
      path,
      sha: await getHash(file),
      size: file.size,
      kind: getAssetKind(name),
      text: null,
      collectionName,
      folder,
    })),
  );

  allAssets.update((assets) => [
    ...assets.filter((a) => !newAssets.some((na) => na.path === a.path)),
    ...newAssets,
  ]);
};

/**
 * Delete the given assets.
 * @param {Asset[]} assets List of assets to be deleted.
 * @todo Update entries to remove these asset paths. If an asset is used for a required field, show
 * an error message and abort the operation.
 */
export const deleteAssets = async (assets) => {
  /**
   * @type {DeletingFile[]}
   */
  const items = assets.map(({ path }) => ({ path }));

  await get(backend).deleteFiles(items, { commitType: 'deleteMedia' });
  allAssets.update((_allAssets) => _allAssets.filter((asset) => !assets.includes(asset)));
};

/**
 * Move assets between folders.
 * @param {Asset[]} assets Assets.
 * @param {string} directory Target directory.
 * @todo Implement this!
 */
export const moveAssets = async (assets, directory) => {
  // eslint-disable-next-line no-console
  console.info(assets, directory);
};
