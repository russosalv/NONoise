# Polly — voice input hint

Fire this in Step 0, **once per session** only. Adapt the language to the
user's locale — keep the three tool names, URLs, and categories intact.

## English version (default)

> Polly works best as a conversation. If you find yourself typing a lot, a
> voice-to-text tool helps:
>
> - **Wispr Flow** — cross-platform, commercial, AI-enhanced dictation
>   https://wisprflow.ai
> - **Handy** — open-source, Win/Mac/Linux
>   https://github.com/cjpais/Handy
> - **Superwhisper** — macOS, strong price/quality ratio
>   https://superwhisper.com
>
> Nothing to install right now — just know the option is there.

## Italian version

> Polly funziona meglio come conversazione. Se ti trovi a digitare tanto,
> uno di questi tool di voice-to-text può aiutare:
>
> - **Wispr Flow** — multipiattaforma, commerciale, dictation AI-enhanced
>   https://wisprflow.ai
> - **Handy** — open-source, Win/Mac/Linux
>   https://github.com/cjpais/Handy
> - **Superwhisper** — macOS, ottimo rapporto qualità/prezzo
>   https://superwhisper.com
>
> Non serve installare niente adesso — è solo un'opzione da tenere a mente.

## Why this hint exists

Polly's decision tree asks a lot of small questions. Typing every answer
gets tiring fast, and users who get tired abandon the flow. Voice-to-text
removes that friction for the users who want it.

## Why the three tools, not one

Each has a clear niche:

- **Wispr Flow** — paid, cross-platform, best polish and AI rewrite
- **Handy** — free, open-source, for users who don't trust closed tools
  or aren't allowed to use them at work
- **Superwhisper** — native macOS, fair price, stays out of the way

One tool would favour one OS / one wallet — three covers reasonable cases.

## Skip conditions

Skip Step 0 if:

- Polly is being re-entered in the same session (user did a detour and
  came back)
- The user has already mentioned voice input in this conversation
- The user is clearly on a mobile interface where voice is already
  available natively — no hint needed
- The user is running Polly non-interactively (rare — only happens in
  scripted tests)

Do **not** skip Step 0 just because the user seems experienced — even
experienced users appreciate the reminder once per session.
