import * as fs from 'fs-extra'
import * as sharp from 'sharp'
import * as path from 'path'

declare var global: any
global.window = { location: { search: "" }}
global.App = { isEditor: false }
global.Global = { rootUrl: "https://ourworldindata.org/grapher" }

require('module-alias').addAliases({
    'react'  : 'preact-compat',
    'react-dom': 'preact-compat'
})

import ChartConfig, { ChartConfigProps } from '../../js/charts/ChartConfig'

export async function chartToSVG(jsonConfig: ChartConfigProps, vardata: any): Promise<string> {
    const chart = new ChartConfig(jsonConfig)
    chart.isLocalExport = true
    chart.vardata.receiveData(vardata)
    return chart.staticSVG
}

export async function chartToPNG(jsonConfig: ChartConfigProps, vardata: any): Promise<Buffer> {
    const chart = new ChartConfig(jsonConfig)
    chart.isLocalExport = true
    chart.vardata.receiveData(vardata)
    return sharp(new Buffer(chart.staticSVG), { density: 144 }).png().resize(chart.idealBounds.width, chart.idealBounds.height).flatten().background('#ffffff').toBuffer()
}

export async function bakeImageExports(outDir: string, jsonConfig: ChartConfigProps, vardata: any) {
    const chart = new ChartConfig(jsonConfig)
    chart.isLocalExport = true
    chart.vardata.receiveData(vardata)
    const outPath = path.join(outDir, chart.props.slug as string)

    return Promise.all([
        fs.writeFile(`${outPath}.svg`, chart.staticSVG).then(_ => console.log(`${outPath}.svg`)),
        sharp(new Buffer(chart.staticSVG), { density: 144 }).png().resize(chart.idealBounds.width, chart.idealBounds.height).flatten().background('#ffffff').toFile(`${outPath}.png`)
    ])
}