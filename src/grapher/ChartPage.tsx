import {BUILD_GRAPHER_URL, BUILD_GRAPHER_PATH} from '../settings'

import * as React from 'react'
import * as path from 'path'
import * as urljoin from 'url-join'
import * as _ from 'lodash'
const md5 = require('md5')

import { webpack } from '../staticGen'
import { ChartConfigProps } from '../../js/charts/ChartConfig'

// HACK (Mispy): Typescript bindings don't support crossorigin attribute on link as of 14 Mar 2018
declare module 'react' {
    interface HTMLAttributes<T> {
       crossorigin?: boolean
   }
}

const ChartPage = (props: { chart: ChartConfigProps }) => {
    const {chart} = props

    const pageTitle = chart.title
    const pageDesc = chart.subtitle || "An interactive visualization from Our World in Data."
    const canonicalUrl = urljoin(BUILD_GRAPHER_URL, chart.slug as string)
    const imageUrl = urljoin(BUILD_GRAPHER_URL, "exports", `${chart.slug}.png?v=${chart.version}`)

    const style = `
        html, body {
            height: 100%;
            margin: 0;
        }

        figure[data-grapher-src], #fallback {
            display: flex;
            align-items: center;
            justify-content: center;
            flex-direction: column;
            margin: 0;
            width: 100%;
            height: 100%;
        }

        #fallback > img {
            max-width: 100%;
            border: 1px solid #ccc;
        }
    `

    const script = `
        var jsonConfig = ${JSON.stringify(chart)};
        var figure = document.getElementsByTagName("figure")[0];
        try {
            window.App = {};
            window.Global = { rootUrl: '${BUILD_GRAPHER_URL}' };
            ChartView.bootstrap({ jsonConfig: jsonConfig, containerNode: figure })
        } catch (err) {
            figure.innerHTML = "<img src=\\"${BUILD_GRAPHER_PATH}/exports/${chart.slug}.svg\\"/><p>Unable to load interactive visualization</p>";
            figure.setAttribute("id", "fallback");
            throw err;
        }
    `

    const variableIds = _.uniq(chart.dimensions.map(d => d.variableId))

    return <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1"/>
            <title>{pageTitle} - Our World in Data</title>
            <meta name="description" content={pageDesc}/>
            <link rel="canonical" href={canonicalUrl}/>
            <meta property="fb:app_id" content="1149943818390250"/>
            <meta property="og:url" content={canonicalUrl}/>
            <meta property="og:title" content={pageTitle}/>
            <meta property="og:description" content={pageDesc}/>
            <meta property="og:image" content={imageUrl}/>
            <meta property="og:image:width" content="850"/>
            <meta property="og:image:height" content="600"/>
            <meta property="og:site_name" content="Our World in Data"/>
            <meta name="twitter:card" content="summary_large_image"/>
            <meta name="twitter:site" content="@OurWorldInData"/>
            <meta name="twitter:creator" content="@OurWorldInData"/>
            <meta name="twitter:title" content={pageTitle}/>
            <meta name="twitter:description" content={pageDesc}/>
            <meta name="twitter:image" content={imageUrl}/>
            <style dangerouslySetInnerHTML={{__html: style}}/>
            <noscript>
                <style>{`
                    figure { display: none !important; }
                `}</style>
            </noscript>
            <link rel="stylesheet" href={webpack("commons.css")}/>
            <link rel="preload" href={`${BUILD_GRAPHER_PATH}/data/variables/${variableIds.join("+")}.json?v=${chart.version}`} as="fetch" crossorigin/>
        </head>
        <body className="singleChart">
            <figure data-grapher-src={`${BUILD_GRAPHER_PATH}/${chart.slug}`}/>
            <noscript id="fallback">
                <img src={`${BUILD_GRAPHER_PATH}/exports/${chart.slug}.svg`}/>
                <p>Interactive visualization requires JavaScript</p>
            </noscript>
            <script src="https://cdn.polyfill.io/v2/polyfill.min.js?features=es6,fetch"/>
            <script src={webpack("commons.js")}/>
            <script src={webpack("charts.js")}/>
            <script dangerouslySetInnerHTML={{__html: script}}/>
        </body>
    </html>
}

export default ChartPage