// This file is part of HFS - Copyright 2021-2023, Massimo Melina <a@rejetto.com> - License https://www.gnu.org/licenses/gpl-3.0.txt

import events from './events'
import { httpsString, httpsStream, unzip } from './misc'
import {
    DISABLING_POSTFIX,
    getAvailablePlugins,
    mapPlugins,
    parsePluginSource,
    PATH as PLUGINS_PATH,
} from './plugins'
import { ApiError } from './apiMiddleware'
import _ from 'lodash'
import { DAY, HFS_REPO, HTTP_BAD_REQUEST, HTTP_CONFLICT } from './const'
import { rename, rm } from 'fs/promises'
import { join } from 'path'

const DIST_ROOT = 'dist'

type DownloadStatus = true | undefined
const downloading: Record<string, DownloadStatus> = {}

function downloadProgress(id: string, status: DownloadStatus) {
    if (status === undefined)
        delete downloading[id]
    else
        downloading[id] = status
    events.emit('pluginDownload_'+id, status)
}

export async function downloadPlugin(repo: string, branch='', overwrite?: boolean) {
    if (downloading[repo])
        return new ApiError(HTTP_CONFLICT, "already downloading")
    console.log('downloading plugin', repo)
    downloadProgress(repo, true)
    try {
        const rec = await getRepoInfo(repo)
        if (!branch)
            branch = rec.default_branch
        const short = repo.split('/')[1] // second part, repo without the owner
        if (!short)
            return new ApiError(HTTP_BAD_REQUEST, "bad repo")
        const folder2repo = getFolder2repo()
        const folder = overwrite ? _.findKey(folder2repo, x => x===repo)! // use existing folder
            : short in folder2repo ? repo.replace('/','-') // longer form only if another plugin is using short form
                : short
        const installPath = PLUGINS_PATH + '/' + folder
        const GITHUB_ZIP_ROOT = short + '-' + branch // GitHub puts everything within this folder
        const rootWithinZip = GITHUB_ZIP_ROOT + '/' + DIST_ROOT
        const foldersToCopy = [ // from longer to shorter, so we first test the longer
            rootWithinZip + '-' + process.platform + '-' + process.arch,
            rootWithinZip + '-' + process.platform,
            rootWithinZip,
        ].map(x => x + '/')
        // this zip doesn't have content-length, so we cannot produce progress event
        const stream = await httpsStream(`https://github.com/${repo}/archive/refs/heads/${branch}.zip`)
        const MAIN = 'plugin.js'
        await unzip(stream, async path => {
            const folder = foldersToCopy.find(x => path.startsWith(x))
            if (!folder || path.endsWith('/')) return false
            let dest = path.slice(folder.length)
            if (dest === MAIN) // avoid being possibly loaded before the download is complete
                dest += DISABLING_POSTFIX
            dest = join(installPath, dest)
            return rm(dest, { force: true }).then(() => dest, () => false)
        })
        const main = join(installPath, MAIN)
        await rename(main + DISABLING_POSTFIX, main) // we are good now, restore name
        return folder
    }
    finally {
        downloadProgress(repo, undefined)
    }
}

export function getRepoInfo(id: string) {
    return apiGithub('repos/'+id)
}

export function readGithubFile(uri: string) {
    return httpsString('https://raw.githubusercontent.com/' + uri)
        .then(res => res.body)
}

export async function readOnlinePlugin(repoInfo: { full_name: string, default_branch: string }, branch='') {
    const res = await readGithubFile(`${repoInfo.full_name}/${branch || repoInfo.default_branch}/${DIST_ROOT}/plugin.js`)
    const pl = parsePluginSource(repoInfo.full_name, res) // use 'repo' as 'id' client-side
    pl.branch = branch || undefined
    return pl
}

export function getFolder2repo() {
    const ret = Object.fromEntries(getAvailablePlugins().map(x => [x.id, x.repo]))
    Object.assign(ret, Object.fromEntries(mapPlugins(x => [x.id, x.getData().repo])))
    return ret
}

async function apiGithub(uri: string) {
    try {
        const res = await httpsString('https://api.github.com/'+uri, {
            headers: {
                'User-Agent': 'HFS',
                Accept: 'application/vnd.github.v3+json',
            }
        })
        if (!res.ok)
            throw res.statusCode
        return JSON.parse(res.body)
    }
    catch(e: any) {
        // https://docs.github.com/en/rest/overview/resources-in-the-rest-api?apiVersion=2022-11-28#rate-limiting
        throw e.message === '403' ? Error('github_quota')
            : e
    }
}

export async function* searchPlugins(text='') {
    const projectInfo = await getProjectInfo()
    const res = await apiGithub('search/repositories?q=topic:hfs-plugin+' + encodeURI(text))
    for (const it of res.items) {
        const repo = it.full_name
        if (projectInfo?.plugins_blacklist?.includes(repo)) continue
        let pl = await readOnlinePlugin(it)
        if (!pl.apiRequired) continue // mandatory field
        if (pl.badApi) { // we try other branches (starting with 'api')
            const res = await apiGithub('repos/' + it.full_name + '/branches')
            const branches: string[] = res.map((x: any) => x?.name)
                .filter((x: any) => typeof x === 'string' && x.startsWith('api'))
                .sort().reverse()
            for (const branch of branches) {
                pl = await readOnlinePlugin(it, branch)
                if (!pl.apiRequired)
                    pl.badApi = '-'
                if (!pl.badApi)
                    break
            }
        }
        if (pl.badApi)
            continue
        Object.assign(pl, { // inject some extra useful fields
            downloading: downloading[repo],
            license: it.license?.spdx_id,
        }, _.pick(it, ['pushed_at', 'stargazers_count']))
        yield pl
    }
}

// centralized hosted information, to be used as little as possible
let cache
export function getProjectInfo() {
    return cache ||= readGithubFile(HFS_REPO + '/main/central.json').then(x => {
        if (!x) throw x // go catch
        setTimeout(() => cache = null, DAY) // invalidate cache
        return JSON.parse(x)
    }).catch(() => { // schedule next attempt
        setTimeout(() => cache = null, 10_000)
    })
}