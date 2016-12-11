# webhook-push

Simple webhook server, intended for incoming updates from Telegram, pushed into Redis queue.

For example, invoke `https://api.telegram.org/botTOKEN/setWebhook` with the URL for this NodeJS webserver and location `/webhook/SECRET.`

However, you must add your webhook SECRET to the set `evanx:webhook-publish:allowed:webhooks:set` to enable it.

Your bot should then pop from `evanx:webhook-publish:SECRET:queue` in order to receive these bot updates.

Note that your bot would reply to chat commands directly using https://api.telegram.org/botTOKEN/sendMessage`


