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

const redis = require('redis');
const client = Promise.promisifyAll(redis.createClient());

async function multiExecAsync(client, multiFunction) {
   const multi = client.multi();
   multiFunction(multi);
   return Promise.promisify(multi.exec).call(multi);
}

const config = {
    port: 8765,
    serviceName: 'telebot',
    loggerLevel: 'debug'
};

const logger = require('winston');
logger.level = config.loggerLevel || 'info';

async function start() {
    api.get('/echo/*', async ctx => {
        ctx.body = JSON.stringify({url: ctx.request.url});
    });
    api.post('/webhook/*', async ctx => {
        ctx.body = '';
        logger.debug('webhook', ctx.request.url, JSON.stringify(ctx.request.body, null, 2));
        multiExecAsync(client, multi => {
            multi.publish([config.serviceName, ctx.params[0]].join(':'), JSON.stringify(ctx.request.body));
        });
    });
    app.use(bodyParser());
    app.use(api.routes());
    app.use(async ctx => {
       ctx.statusCode = 501;
    });
    state.server = app.listen(config.port);
}

start().catch(err => {
    logger.error(err);
});
