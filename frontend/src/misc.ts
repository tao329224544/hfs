// This file is part of HFS - Copyright 2021-2023, Massimo Melina <a@rejetto.com> - License https://www.gnu.org/licenses/gpl-3.0.txt

import React, { createElement as h } from 'react'
import { Spinner } from './components'
import { newDialog } from './dialog'
import { Icon } from './icons'
import { Dict, getHFS } from '@hfs/shared'
import { state } from './state'
import { t } from './i18n'
import * as dialogLib from './dialog'
import _ from 'lodash'
import { apiCall, setDefaultApiCallOptions } from '@hfs/shared/api'
import { reloadList } from './useFetchList'
import { logout } from './login'
import { subscribeKey } from 'valtio/utils'
import { uploadState } from './upload'
export * from '@hfs/shared'

export const ERRORS: Record<number, string> = {
    401: "Unauthorized",
    403: "Forbidden",
    404: "Not found",
    500: "Server error",
}

export function err2msg(err: number | Error) {
    return typeof err === 'number' ? ERRORS[err]
        : (ERRORS[(err as any).code] || err.message || String(err))
}

export function hIcon(name: string, props?:any) {
    return h(Icon, { name, ...props })
}

export function ErrorMsg({ err }: { err: Error | string | undefined }) {
    return err ? h('div', { className:'error-msg' }, typeof err === 'string' ? err : err.message)
        : null
}

let isWorking = false // we want the 'working' thing to be singleton
export function working() {
    if (isWorking)
        return ()=>{} // noop
    isWorking = true
    return newDialog({
        closable: false,
        noFrame: true,
        Content: Spinner,
        reserveClosing: true,
        className: 'working',
        onClose(){
            isWorking = false
        }
    })
}

export function hfsEvent(name: string, params?:Dict) {
    const output: any[] = []
    document.dispatchEvent(new CustomEvent('hfs.'+name, { detail: { params, output } }))
    return output
}

const tools = { h, React, state, t, _, dialogLib, apiCall, reloadList, logout, Icon, hIcon,
    watchState(k: string, cb: (v: any) => void) {
        const up = k.split('upload.')[1]
        return subscribeKey(up ? uploadState : state as any, up || k, cb, true)
    }
}
Object.assign(getHFS(), {
    ...tools,
    emit: hfsEvent,
    onEvent(name: string, cb: (params:any, tools: any, output:any) => any) {
        const key = 'hfs.' + name
        document.addEventListener(key, wrapper)
        return () => document.removeEventListener(key, wrapper)

        function wrapper(ev: Event) {
            const { params, output } = (ev as CustomEvent).detail
            const res = cb(params, tools, output)
            if (res !== undefined && Array.isArray(output))
                output.push(res)
        }
    }
})

setDefaultApiCallOptions({ modal: working })
