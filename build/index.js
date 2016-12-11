let multiExecAsync = (() => {
    var _ref = _asyncToGenerator(function* (client, multiFunction) {
        const multi = client.multi();
        multiFunction(multi);
        return Promise.promisify(multi.exec).call(multi);
    });

    return function multiExecAsync(_x, _x2) {
        return _ref.apply(this, arguments);
    };
})();

let start = (() => {
    var _ref2 = _asyncToGenerator(function* () {
        api.get('/echo/*', (() => {
            var _ref3 = _asyncToGenerator(function* (ctx) {
                ctx.body = JSON.stringify({ url: ctx.request.url });
            });

            return function (_x3) {
                return _ref3.apply(this, arguments);
            };
        })());
        api.post('/webhook/*', (() => {
            var _ref4 = _asyncToGenerator(function* (ctx) {
                ctx.body = '';
                logger.debug('webhook', ctx.request.url, JSON.stringify(ctx.request.body, null, 2));
                const id = ctx.params[0];
                if (yield client.sismemberAsync([config.redisName, 'allowed:ids'].join(':'), id)) {
                    yield client.lpush([config.redisName, id, 'in'].join(':'), JSON.stringify(ctx.request.body));
                } else {
                    logger.debug({ id, config });
                }
            });

            return function (_x4) {
                return _ref4.apply(this, arguments);
            };
        })());
        app.use(bodyParser());
        app.use(api.routes());
        app.use((() => {
            var _ref5 = _asyncToGenerator(function* (ctx) {
                ctx.statusCode = 404;
            });

            return function (_x5) {
                return _ref5.apply(this, arguments);
            };
        })());
        state.server = app.listen(config.port);
        if (process.env.NODE_ENV === 'test') {
            return test();
        }
    });

    return function start() {
        return _ref2.apply(this, arguments);
    };
})();

let test = (() => {
    var _ref6 = _asyncToGenerator(function* () {
        const now = Date.now();
        logger.debug('now', now, typeof now);
        const response = yield fetch('http://localhost:8801/echo/' + now, {
            timeout: 100
        });
        if (response.status !== 200) {
            throw new Error(`status ${ response.status }`);
        }
        const json = yield response.json();
        logger.debug('json', json);
        assert(json.url.endsWith(now));
        return end();
    });

    return function test() {
        return _ref6.apply(this, arguments);
    };
})();

let end = (() => {
    var _ref7 = _asyncToGenerator(function* () {
        client.quit();
        if (state.server) {
            state.server.close();
        }
    });

    return function end() {
        return _ref7.apply(this, arguments);
    };
})();

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

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

const logger = require('winston');
logger.level = config.loggerLevel || 'info';

start().catch(err => {
    logger.error(err);
    end();
});
