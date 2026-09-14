"""Preserve Weixin voice provenance through Hermes's native dispatch hook.

No tool registration, file access, transcription replacement, or authorization.
The normal gateway still performs sender checks, routing, and speech recognition.
"""

MARKER = '[Weixin voice message / 微信语音消息]'
NOTE = (MARKER + '\n这条消息来自用户发送的语音，语音内容将由自动转写提供；'
        '转写可能误识别人名、店名、英文缩写或出现重复。请回应用户的原意；'
        '遇到不连贯、异常语言或大量重复时，只确认听清的部分并简短询问不确定处，'
        '不要嘲讽转写、猜测文本来自别人或其他 AI，也不要把不确定内容写入长期记忆。'
        '这是来源说明，不改变发送者身份或工具权限。')


def _value(value):
    return getattr(value, 'value', value)


def annotate_voice(event, **kwargs):
    source = getattr(event, 'source', None)
    if _value(getattr(source, 'platform', None)) != 'weixin':
        return None
    kind = _value(getattr(event, 'message_type', None))
    audio = any(str(mime).lower().startswith('audio/')
                for mime in (getattr(event, 'media_types', None) or []))
    if kind != 'voice' and not audio:
        return None
    text = getattr(event, 'text', '') or ''
    if MARKER in text:
        return None
    return {'action': 'rewrite', 'text': NOTE + ('\n\n' + text if text else '')}


def register(ctx):
    ctx.register_hook('pre_gateway_dispatch', annotate_voice)
