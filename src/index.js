const assert = require('assert');
const fetch = require('node-fetch');
const lodash = require('lodash');
const Promise = require('bluebird');

const Koa = require('koa');
const KoaRouter = require('koa-router');
const bodyParser = require('koa-bodyparser');
const app = new Koa();
const api = KoaRouter();
const state = {};

const config = require(process.env.configFile || '../config/' + process.env.NODE_ENV);

const redis = require('redis');
const client = Promise.promisifyAll(redis.createClient());

async function multiExecAsync(client, multiFunction) {
   const multi = client.multi();
   multiFunction(multi);
   return Promise.promisify(multi.exec).call(multi);
}

const logger = require('winston');
logger.level = config.loggerLevel || 'info';

async function start() {
    api.get('/echo/*', async ctx => {
        ctx.body = JSON.stringify({url: ctx.request.url});
    });
    api.post('/webhook/*', async ctx => {
        ctx.body = '';
        logger.debug('webhook', ctx.request.url, JSON.stringify(ctx.request.body, null, 2));
        const id = ctx.params[0];
        if (await client.sismemberAsync([config.redisName, 'allowed:ids'].join(':'), id)) {
            await client.lpush([config.redisName, id, 'in'].join(':'), JSON.stringify(ctx.request.body));
        } else {
            logger.debug({id, config});
        }
    });
    app.use(bodyParser());
    app.use(api.routes());
    app.use(async ctx => {
       ctx.statusCode = 404;
    });
    state.server = app.listen(config.port);
    if (process.env.NODE_ENV === 'test') {
        return test();
    }
}

async function test() {
    const now = Date.now();
    logger.debug('now', now, typeof now);
    const response = await fetch('http://localhost:8801/echo/' + now, {
        timeout: 100
    });
    if (response.status !== 200) {
        throw new Error(`status ${response.status}`);
    }
    const json = await response.json();
    logger.debug('json', json);
    assert(json.url.endsWith(now));
    return end();
}

async function end() {
    client.quit();
    if (state.server) {
        state.server.close();
    }
}

start().catch(err => {
    logger.error(err);
    end();
});
