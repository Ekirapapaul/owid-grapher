import * as path from 'path'
import * as parseUrl from 'url-parse'

require('module-alias').addAliases({
    'react'  : 'preact-compat',
    'react-dom': 'preact-compat'
})

require('dotenv').config()

interface Settings {
    // These settings are loaded from .env
    DB_NAME: string
    DB_USER: string
    DB_PASS: string
    DB_HOST: string
    DB_PORT: string
    ENV: 'production'|'development'
    WEBPACK_DEV_URL: string
    BUILD_URL: string
    BUILD_ASSETS_URL: string
    BASE_DIR: string
    SECRET_KEY: string
    NODE_SERVER_PORT: number
    SLACK_ERRORS_WEBHOOK_URL: string
    SESSION_COOKIE_AGE: number
    WORDPRESS_DB_NAME: string
    WORDPRESS_DIR: string

    // These settings are inferred from other settings
    BUILD_GRAPHER_PATH: string
    BUILD_DIR: string
}

const env: Settings = (process.env as any)

env.ENV = (env.ENV === "production" || process.env.NODE_ENV === "production") ? "production" : "development"
env.BASE_DIR = path.join(__dirname, "../../")
env.BUILD_DIR = path.join(env.BASE_DIR, "public")
env.SESSION_COOKIE_AGE = process.env.SESSION_COOKIE_AGE ? parseInt(process.env.SESSION_COOKIE_AGE) : 1209600

env.BUILD_GRAPHER_PATH = "/grapher"

export = env