# webhook-push

Push the JSON contents of a webhook into a Redis queue named according to the URL path.

It is intended for incoming updates from Telegram.org bots.

This is useful for development insomuch as you can use ssh port forwarding to the remote Redis instance, to effectively receive webhook notifications from live Telegram.org bots onto your development machine.
```shell
ssh webhook-push-redis -L6333:127.0.0.1:6379
```

Invoke `https://api.telegram.org/botTOKEN/setWebhook` with your deployment URL.

It also simplifies production of multiple Telegram bots, which each are "hooked up" via a Redis connection, i.e. requiring minimal configuration. The HTTPS server requires Certbot and Nginx, but is a single generic deployment, that can service webhooks for multiple bots.

The path of URL would `/webhook/${WEBHOOK_SECRET}` where you might generate a random `WEBHOOK_SECRET` as follows.

```shell
dd if=/dev/random bs=32 count=1 2>/dev/null | sha1sum | cut -f1 -d' '
```

Alternatively see my http://github.com/evanx/secret-base56
```
docker build -t secret-base56 https://github.com/evanx/secret-base56.git
docker run -e length=40 secret-base56
```

Your bot handler should then `rpoplpush` from `telebotpush:${WEBHOOK_SECRET}:in` in order to receive these updates via Telegram.org.
```
redis-cli rpop telebotpush:$WEBHOOK_SECRET:in | jq '.message .from .username'
```

You must whitelist your `WEBHOOK_SECRET` in `telebotpush:allowed:ids`
```
redis-cli sadd telebotpush:allowed:ids $WEBHOOK_SECRET
```

Note that your bot would reply to chat commands directly using `api.telegram.org/botTOKEN/sendMessage`

where the `TOKEN` for your bot is provided by @BotFather when you use the commands `/newbot` or `/token`

For example:

```javascript
async function sendTelegram(chatId, format, ...content) {
    logger.debug('sendTelegram', chatId, format, content);
    try {
        const text = lodash.trim(lodash.flatten(content).join(' '));
        assert(chatId, 'chatId');
        let uri = `sendMessage?chat_id=${chatId}`;
        uri += '&disable_notification=true';
        if (format === 'markdown') {
            uri += `&parse_mode=Markdown`;
        } else if (format === 'html') {
            uri += `&parse_mode=HTML`;
        }
        uri += `&text=${encodeURIComponent(text)}`;
        const url = `https://api.telegram.org/bot${config.token}/${uri}`;
        const res = await fetch(url);
        if (res.status !== 200) {
            logger.warn('sendTelegram', chatId, url);
        }
    } catch (err) {
        logger.error('sendTelegram', err);
    }
}
```

### Related 

https://github.com/evanx/webhook-publish - webhooks to Redis pubsub 

