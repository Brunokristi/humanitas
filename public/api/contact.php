<?php

declare(strict_types=1);

use Dotenv\Dotenv;
use PHPMailer\PHPMailer\Exception;
use PHPMailer\PHPMailer\PHPMailer;

header(
    'Content-Type: application/json; charset=utf-8'
);

header(
    'X-Content-Type-Options: nosniff'
);

header(
    'Referrer-Policy: same-origin'
);

/*
|--------------------------------------------------------------------------
| Response helper
|--------------------------------------------------------------------------
*/

function jsonResponse(
    array $data,
    int $status = 200
): never {
    http_response_code(
        $status
    );

    echo json_encode(
        $data,
        JSON_UNESCAPED_UNICODE |
        JSON_UNESCAPED_SLASHES
    );

    exit;
}

/*
|--------------------------------------------------------------------------
| Request method
|--------------------------------------------------------------------------
*/

if (
    $_SERVER['REQUEST_METHOD'] ===
    'OPTIONS'
) {
    http_response_code(204);
    exit;
}

if (
    $_SERVER['REQUEST_METHOD'] !==
    'POST'
) {
    jsonResponse(
        [
            'message' =>
                'Method not allowed.'
        ],
        405
    );
}

/*
|--------------------------------------------------------------------------
| Project bootstrap
|--------------------------------------------------------------------------
|
| Works when this file is:
|
| public/api/contact.php
|
| and also after Vite copies it to:
|
| dist/api/contact.php
|
*/

$projectRoot =
    dirname(
        __DIR__,
        2
    );

$autoloadPath =
    $projectRoot .
    '/vendor/autoload.php';

if (
    !file_exists(
        $autoloadPath
    )
) {
    error_log(
        'Contact form: vendor/autoload.php not found at ' .
        $autoloadPath
    );

    jsonResponse(
        [
            'message' =>
                'E-mailová služba nie je dostupná.'
        ],
        500
    );
}

require $autoloadPath;

/*
|--------------------------------------------------------------------------
| Environment
|--------------------------------------------------------------------------
*/

$dotenv =
    Dotenv::createImmutable(
        $projectRoot
    );

$dotenv->safeLoad();

$mailConfig = [
    'host' =>
        $_ENV['MAIL_HOST'] ??
        'smtp.gmail.com',

    'port' =>
        (int) (
            $_ENV['MAIL_PORT'] ??
            587
        ),

    'username' =>
        $_ENV['MAIL_USERNAME'] ??
        '',

    'password' =>
        $_ENV['MAIL_PASSWORD'] ??
        '',

    'encryption' =>
        $_ENV['MAIL_ENCRYPTION'] ??
        'tls',

    'from_address' =>
        $_ENV['MAIL_FROM_ADDRESS'] ??
        '',

    'from_name' =>
        $_ENV['MAIL_FROM_NAME'] ??
        'Humanitas',

    'contact_to' =>
        $_ENV['CONTACT_MAIL_TO'] ??
        ''
];

/*
|--------------------------------------------------------------------------
| Easy branding controls
|--------------------------------------------------------------------------
|
| MAIL_LOGO_PATH is optional.
|
| When it is missing, the code automatically checks:
|
| public/images/humanitas_logo.png
| dist/images/humanitas_logo.png
|
| The logo is embedded directly into every message using CID, so it does not
| depend on the recipient allowing external images.
*/

$branding = [
    'name' =>
        $_ENV['BRAND_NAME'] ??
        'Humanitas',

    'logo_path' =>
        $_ENV['MAIL_LOGO_PATH'] ??
        '',

    'logo_cid' =>
        'humanitas-logo',

    'green' =>
        '#335940',

    'beige' =>
        '#FBF9F3',

    'soft_beige' =>
        '#F3EFE4',

    'muted_green' =>
        '#6F8576',

    /*
     * Simple e-mail style controls.
     */
    'email_logo_width' =>
        96,

    'email_card_radius' =>
        34,

    'email_card_max_width' =>
        620,

    'email_outer_padding' =>
        24,

    'email_horizontal_padding' =>
        34
];

if (
    !$mailConfig['username'] ||
    !$mailConfig['password'] ||
    !$mailConfig['from_address'] ||
    !$mailConfig['contact_to']
) {
    error_log(
        'Contact form: incomplete mail configuration.'
    );

    jsonResponse(
        [
            'message' =>
                'E-mailová služba nie je správne nakonfigurovaná.'
        ],
        500
    );
}

/*
|--------------------------------------------------------------------------
| Read request
|--------------------------------------------------------------------------
*/

$rawBody =
    file_get_contents(
        'php://input'
    );

$data =
    json_decode(
        $rawBody ?: '',
        true
    );

if (
    !is_array(
        $data
    )
) {
    jsonResponse(
        [
            'message' =>
                'Neplatná požiadavka.'
        ],
        400
    );
}

/*
|--------------------------------------------------------------------------
| Normalize values
|--------------------------------------------------------------------------
*/

$name =
    trim(
        (string) (
            $data[
                'sender_name'
            ] ??
            ''
        )
    );

$email =
    trim(
        (string) (
            $data[
                'sender_email'
            ] ??
            ''
        )
    );

$phone =
    trim(
        (string) (
            $data[
                'sender_phone'
            ] ??
            ''
        )
    );

$message =
    trim(
        (string) (
            $data[
                'body'
            ] ??
            ''
        )
    );

$website =
    trim(
        (string) (
            $data[
                'website'
            ] ??
            ''
        )
    );

$formStartedAt =
    (int) (
        $data[
            'form_started_at'
        ] ??
        0
    );

/*
|--------------------------------------------------------------------------
| Honeypot
|--------------------------------------------------------------------------
|
| A real visitor never fills this field.
|
| Return success intentionally so a bot does not learn that it has been
| detected.
*/

if (
    $website !== ''
) {
    jsonResponse([
        'message' =>
            'Správa bola odoslaná.'
    ]);
}

/*
|--------------------------------------------------------------------------
| Timing protection
|--------------------------------------------------------------------------
|
| Submitting a full form in less than two seconds is extremely unlikely for
| a human.
*/

if (
    $formStartedAt > 0
) {
    $elapsed =
        time() -
        $formStartedAt;

    if (
        $elapsed >= 0 &&
        $elapsed < 2
    ) {
        jsonResponse([
            'message' =>
                'Správa bola odoslaná.'
        ]);
    }
}

/*
|--------------------------------------------------------------------------
| Validation
|--------------------------------------------------------------------------
*/

$errors = [];

if (
    $name === ''
) {
    $errors[
        'sender_name'
    ] = [
        'Zadajte vaše meno.'
    ];
} elseif (
    mb_strlen(
        $name
    ) > 120
) {
    $errors[
        'sender_name'
    ] = [
        'Meno je príliš dlhé.'
    ];
}

if (
    $email === '' ||
    !filter_var(
        $email,
        FILTER_VALIDATE_EMAIL
    )
) {
    $errors[
        'sender_email'
    ] = [
        'Zadajte platnú e-mailovú adresu.'
    ];
} elseif (
    mb_strlen(
        $email
    ) > 255
) {
    $errors[
        'sender_email'
    ] = [
        'E-mailová adresa je príliš dlhá.'
    ];
}

if (
    $phone === ''
) {
    $errors[
        'sender_phone'
    ] = [
        'Zadajte telefónne číslo.'
    ];
} elseif (
    mb_strlen(
        $phone
    ) > 50
) {
    $errors[
        'sender_phone'
    ] = [
        'Telefónne číslo je príliš dlhé.'
    ];
}

if (
    $message === ''
) {
    $errors[
        'body'
    ] = [
        'Napíšte správu.'
    ];
} elseif (
    mb_strlen(
        $message
    ) > 5000
) {
    $errors[
        'body'
    ] = [
        'Správa môže obsahovať maximálne 5000 znakov.'
    ];
}

if (
    !empty(
        $errors
    )
) {
    jsonResponse(
        [
            'message' =>
                'Skontrolujte vyplnené údaje.',

            'errors' =>
                $errors
        ],
        422
    );
}

/*
|--------------------------------------------------------------------------
| Rate limiting
|--------------------------------------------------------------------------
|
| Maximum 5 real submissions from one IP during a 10 minute window.
*/

function isRateLimited(
    string $ip
): bool {
    $maximumRequests = 5;
    $windowSeconds = 600;

    $identifier =
        hash(
            'sha256',
            $ip
        );

    $file =
        sys_get_temp_dir() .
        '/humanitas-contact-' .
        $identifier .
        '.json';

    $now =
        time();

    $handle =
        fopen(
            $file,
            'c+'
        );

    if (!$handle) {
        /*
         * If temporary storage is unavailable, do not prevent legitimate
         * submissions.
         */
        return false;
    }

    try {
        if (
            !flock(
                $handle,
                LOCK_EX
            )
        ) {
            return false;
        }

        rewind(
            $handle
        );

        $contents =
            stream_get_contents(
                $handle
            );

        $timestamps =
            json_decode(
                $contents ?: '[]',
                true
            );

        if (
            !is_array(
                $timestamps
            )
        ) {
            $timestamps = [];
        }

        $timestamps =
            array_values(
                array_filter(
                    $timestamps,
                    static function (
                        mixed $timestamp
                    ) use (
                        $now,
                        $windowSeconds
                    ): bool {
                        return (
                            is_numeric(
                                $timestamp
                            ) &&
                            (
                                $now -
                                (int) $timestamp
                            ) <
                            $windowSeconds
                        );
                    }
                )
            );

        if (
            count(
                $timestamps
            ) >=
            $maximumRequests
        ) {
            return true;
        }

        $timestamps[] =
            $now;

        ftruncate(
            $handle,
            0
        );

        rewind(
            $handle
        );

        fwrite(
            $handle,
            json_encode(
                $timestamps
            )
        );

        fflush(
            $handle
        );

        return false;
    } finally {
        flock(
            $handle,
            LOCK_UN
        );

        fclose(
            $handle
        );
    }
}

$clientIp =
    $_SERVER[
        'REMOTE_ADDR'
    ] ??
    'unknown';

if (
    isRateLimited(
        $clientIp
    )
) {
    jsonResponse(
        [
            'message' =>
                'Odoslali ste príliš veľa správ. Skúste to prosím neskôr.'
        ],
        429
    );
}

/*
|--------------------------------------------------------------------------
| Mailer factory
|--------------------------------------------------------------------------
*/

function createMailer(
    array $config
): PHPMailer {
    $mailer =
        new PHPMailer(
            true
        );

    $mailer->isSMTP();

    $mailer->Host =
        $config[
            'host'
        ];

    $mailer->Port =
        $config[
            'port'
        ];

    $mailer->SMTPAuth =
        true;

    $mailer->Username =
        $config[
            'username'
        ];

    $mailer->Password =
        $config[
            'password'
        ];

    if (
        strtolower(
            $config[
                'encryption'
            ]
        ) ===
        'ssl'
    ) {
        $mailer->SMTPSecure =
            PHPMailer::ENCRYPTION_SMTPS;
    } else {
        $mailer->SMTPSecure =
            PHPMailer::ENCRYPTION_STARTTLS;
    }

    $mailer->CharSet =
        'UTF-8';

    $mailer->Encoding =
        'base64';

    $mailer->setFrom(
        $config[
            'from_address'
        ],
        $config[
            'from_name'
        ]
    );

    $mailer->isHTML(
        true
    );

    return $mailer;
}

/*
|--------------------------------------------------------------------------
| Logo helpers
|--------------------------------------------------------------------------
*/

function resolveLogoPath(
    string $projectRoot,
    string $configuredPath
): ?string {
    $candidates = [];

    if (
        trim(
            $configuredPath
        ) !== ''
    ) {
        if (
            str_starts_with(
                $configuredPath,
                '/'
            )
        ) {
            $candidates[] =
                $configuredPath;
        } else {
            $candidates[] =
                $projectRoot .
                '/' .
                ltrim(
                    $configuredPath,
                    '/'
                );
        }
    }

    $candidates[] =
        $projectRoot .
        '/public/images/humanitas_logo.png';

    $candidates[] =
        $projectRoot .
        '/dist/images/humanitas_logo.png';

    foreach (
        $candidates as
        $candidate
    ) {
        if (
            is_file(
                $candidate
            ) &&
            is_readable(
                $candidate
            )
        ) {
            return $candidate;
        }
    }

    return null;
}

function embedBrandLogo(
    PHPMailer $mailer,
    array $branding,
    string $projectRoot
): ?string {
    $logoPath =
        resolveLogoPath(
            $projectRoot,
            (string) (
                $branding[
                    'logo_path'
                ] ??
                ''
            )
        );

    if (!$logoPath) {
        error_log(
            'Contact form: email logo was not found.'
        );

        return null;
    }

    $extension =
        strtolower(
            pathinfo(
                $logoPath,
                PATHINFO_EXTENSION
            )
        );

    $mimeType =
        match (
            $extension
        ) {
            'svg' =>
                'image/svg+xml',

            'jpg',
            'jpeg' =>
                'image/jpeg',

            'webp' =>
                'image/webp',

            default =>
                'image/png'
        };

    $fileName =
        basename(
            $logoPath
        );

    $mailer->addEmbeddedImage(
        $logoPath,
        $branding[
            'logo_cid'
        ],
        $fileName,
        'base64',
        $mimeType
    );

    return (
        'cid:' .
        $branding[
            'logo_cid'
        ]
    );
}

/*
|--------------------------------------------------------------------------
| Email design helpers
|--------------------------------------------------------------------------
|
| Email clients support less CSS than browsers, so the design uses tables
| and inline styles. The visual language follows the app:
|
| green page background
| simple beige rounded sheet
| small centered logo
| plain green typography
| no decorative header or footer blocks
*/

function renderBrandHeader(
    array $branding,
    ?string $logoSource
): string {
    $brandName =
        htmlspecialchars(
            (string) $branding[
                'name'
            ],
            ENT_QUOTES |
            ENT_SUBSTITUTE,
            'UTF-8'
        );

    $logoWidth =
        max(
            48,
            min(
                240,
                (int) (
                    $branding[
                        'email_logo_width'
                    ] ??
                    96
                )
            )
        );

    if ($logoSource) {
        $safeLogoSource =
            htmlspecialchars(
                $logoSource,
                ENT_QUOTES |
                ENT_SUBSTITUTE,
                'UTF-8'
            );

        return <<<HTML
<img
    src="{$safeLogoSource}"
    width="{$logoWidth}"
    alt="{$brandName}"
    style="
        display: block;
        width: {$logoWidth}px;
        max-width: 100%;
        height: auto;
        margin: 0 auto;
        border: 0;
        outline: none;
        text-decoration: none;
    "
>
HTML;
    }

    return <<<HTML
<div
    style="
        color: #335940;
        font-family:
            Georgia,
            'Times New Roman',
            serif;
        font-size: 21px;
        line-height: 1.2;
        font-weight: 700;
        text-align: center;
    "
>
    {$brandName}
</div>
HTML;
}

function renderEmailShell(
    array $branding,
    ?string $logoSource,
    string $documentTitle,
    string $content,
    string $footer
): string {
    $brandHeader =
        renderBrandHeader(
            $branding,
            $logoSource
        );

    $safeDocumentTitle =
        htmlspecialchars(
            $documentTitle,
            ENT_QUOTES |
            ENT_SUBSTITUTE,
            'UTF-8'
        );

    $safeFooter =
        htmlspecialchars(
            $footer,
            ENT_QUOTES |
            ENT_SUBSTITUTE,
            'UTF-8'
        );

    $green =
        $branding[
            'green'
        ];

    $beige =
        $branding[
            'beige'
        ];

    $cardRadius =
        max(
            12,
            min(
                60,
                (int) (
                    $branding[
                        'email_card_radius'
                    ] ??
                    34
                )
            )
        );

    $cardMaxWidth =
        max(
            320,
            min(
                760,
                (int) (
                    $branding[
                        'email_card_max_width'
                    ] ??
                    620
                )
            )
        );

    $outerPadding =
        max(
            10,
            min(
                60,
                (int) (
                    $branding[
                        'email_outer_padding'
                    ] ??
                    24
                )
            )
        );

    $horizontalPadding =
        max(
            18,
            min(
                60,
                (int) (
                    $branding[
                        'email_horizontal_padding'
                    ] ??
                    34
                )
            )
        );

    return <<<HTML
<!DOCTYPE html>
<html lang="sk">
<head>
    <meta charset="UTF-8">
    <meta
        name="viewport"
        content="width=device-width, initial-scale=1"
    >

    <meta
        name="color-scheme"
        content="light"
    >

    <meta
        name="supported-color-schemes"
        content="light"
    >

    <title>{$safeDocumentTitle}</title>
</head>

<body
    style="
        margin: 0;
        padding: 0;
        width: 100%;
        background-color: {$green};
        color: {$green};
        font-family:
            'Avenir Next',
            'Segoe UI',
            Arial,
            Helvetica,
            sans-serif;
        -webkit-text-size-adjust: 100%;
        -ms-text-size-adjust: 100%;
    "
>
    <table
        role="presentation"
        width="100%"
        cellpadding="0"
        cellspacing="0"
        border="0"
        style="
            width: 100%;
            border-collapse: collapse;
            background-color: {$green};
        "
    >
        <tr>
            <td
                align="center"
                style="
                    padding: {$outerPadding}px 10px;
                "
            >
                <table
                    role="presentation"
                    width="100%"
                    cellpadding="0"
                    cellspacing="0"
                    border="0"
                    style="
                        width: 100%;
                        max-width: {$cardMaxWidth}px;
                        border-collapse: separate;
                        background-color: {$beige};
                        border-radius: {$cardRadius}px;
                        overflow: hidden;
                    "
                >
                    <tr>
                        <td
                            align="center"
                            style="
                                padding:
                                    28px
                                    28px
                                    0;
                            "
                        >
                            {$brandHeader}
                        </td>
                    </tr>

                    <tr>
                        <td
                            style="
                                padding:
                                    28px
                                    {$horizontalPadding}px
                                    0;
                            "
                        >
                            {$content}
                        </td>
                    </tr>

                    <tr>
                        <td
                            align="center"
                            style="
                                padding:
                                    26px
                                    {$horizontalPadding}px
                                    30px;
                                color:
                                    rgba(
                                        51,
                                        89,
                                        64,
                                        0.5
                                    );
                                font-size: 11px;
                                line-height: 1.6;
                            "
                        >
                            {$safeFooter}
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
HTML;
}

function renderDetailRow(
    string $label,
    string $value,
    ?string $href = null
): string {
    $safeLabel =
        htmlspecialchars(
            $label,
            ENT_QUOTES |
            ENT_SUBSTITUTE,
            'UTF-8'
        );

    $safeValue =
        htmlspecialchars(
            $value,
            ENT_QUOTES |
            ENT_SUBSTITUTE,
            'UTF-8'
        );

    $valueHtml =
        $safeValue;

    if ($href) {
        $safeHref =
            htmlspecialchars(
                $href,
                ENT_QUOTES |
                ENT_SUBSTITUTE,
                'UTF-8'
            );

        $valueHtml = <<<HTML
<a
    href="{$safeHref}"
    style="
        color: #335940;
        text-decoration: none;
    "
>
    {$safeValue}
</a>
HTML;
    }

    return <<<HTML
<tr>
    <td
        style="
            padding:
                0
                0
                12px;
        "
    >
        <table
            role="presentation"
            width="100%"
            cellpadding="0"
            cellspacing="0"
            border="0"
            style="
                width: 100%;
                border-collapse: collapse;
            "
        >
            <tr>
                <td
                    style="
                        width: 2px;
                        background-color: #335940;
                        border-radius: 999px;
                        font-size: 0;
                        line-height: 0;
                    "
                >
                    &nbsp;
                </td>

                <td
                    style="
                        padding:
                            3px
                            0
                            3px
                            14px;
                    "
                >
                    <p
                        style="
                            margin: 0;
                            color:
                                rgba(
                                    51,
                                    89,
                                    64,
                                    0.52
                                );
                            font-size: 11px;
                            line-height: 1.4;
                            font-weight: 700;
                            letter-spacing: 0.1em;
                            text-transform: uppercase;
                        "
                    >
                        {$safeLabel}
                    </p>

                    <p
                        style="
                            margin:
                                6px
                                0
                                0;
                            color: #335940;
                            font-size: 16px;
                            line-height: 1.55;
                            font-weight: 700;
                            word-break: break-word;
                        "
                    >
                        {$valueHtml}
                    </p>
                </td>
            </tr>
        </table>
    </td>
</tr>
HTML;
}

function renderMessageBlock(
    string $title,
    string $safeMessage
): string {
    $safeTitle =
        htmlspecialchars(
            $title,
            ENT_QUOTES |
            ENT_SUBSTITUTE,
            'UTF-8'
        );

    return <<<HTML
<table
    role="presentation"
    width="100%"
    cellpadding="0"
    cellspacing="0"
    border="0"
    style="
        width: 100%;
        margin-top: 22px;
        border-collapse: collapse;
    "
>
    <tr>
        <td
            style="
                width: 2px;
                background-color:
                    rgba(
                        51,
                        89,
                        64,
                        0.22
                    );
                border-radius: 999px;
                font-size: 0;
                line-height: 0;
            "
        >
            &nbsp;
        </td>

        <td
            style="
                padding:
                    1px
                    0
                    1px
                    14px;
            "
        >
            <p
                style="
                    margin: 0;
                    color: #335940;
                    font-size: 12px;
                    line-height: 1.4;
                    font-weight: 700;
                    letter-spacing: 0.08em;
                    text-transform: uppercase;
                "
            >
                {$safeTitle}
            </p>

            <div
                style="
                    margin-top: 9px;
                    color:
                        rgba(
                            51,
                            89,
                            64,
                            0.78
                        );
                    font-size: 15px;
                    line-height: 1.75;
                    word-break: break-word;
                "
            >
                {$safeMessage}
            </div>
        </td>
    </tr>
</table>
HTML;
}

/*
|--------------------------------------------------------------------------
| Safe HTML values
|--------------------------------------------------------------------------
*/

$safeName =
    htmlspecialchars(
        $name,
        ENT_QUOTES |
        ENT_SUBSTITUTE,
        'UTF-8'
    );

$safeEmail =
    htmlspecialchars(
        $email,
        ENT_QUOTES |
        ENT_SUBSTITUTE,
        'UTF-8'
    );

$safePhone =
    htmlspecialchars(
        $phone,
        ENT_QUOTES |
        ENT_SUBSTITUTE,
        'UTF-8'
    );

$safeMessage =
    nl2br(
        htmlspecialchars(
            $message,
            ENT_QUOTES |
            ENT_SUBSTITUTE,
            'UTF-8'
        )
    );

$phoneHrefValue =
    preg_replace(
        '/[^\d+]/',
        '',
        $phone
    ) ?: '';

/*
|--------------------------------------------------------------------------
| Send enquiry to clinic
|--------------------------------------------------------------------------
*/

try {
    $notification =
        createMailer(
            $mailConfig
        );

    $notification
        ->addAddress(
            $mailConfig[
                'contact_to'
            ]
        );

    /*
     * Gmail still sees the authenticated account as the sender.
     *
     * Reply in Gmail goes directly to the visitor.
     */
    $notification
        ->addReplyTo(
            $email,
            $name
        );

    $notification->Subject =
        'Nová správa z webu – ' .
        $name;

    $notificationLogoSource =
        embedBrandLogo(
            $notification,
            $branding,
            $projectRoot
        );

    $notificationDetails =
        '<table role="presentation" width="100%" cellpadding="0" ' .
        'cellspacing="0" border="0" style="width: 100%; ' .
        'border-collapse: collapse;">' .
        renderDetailRow(
            'Meno',
            $name
        ) .
        renderDetailRow(
            'E-mail',
            $email,
            'mailto:' .
            $email
        ) .
        renderDetailRow(
            'Telefón',
            $phone,
            $phoneHrefValue !== ''
                ? 'tel:' .
                    $phoneHrefValue
                : null
        ) .
        '</table>' .
        renderMessageBlock(
            'Správa',
            $safeMessage
        );

    $notification->Body =
        renderEmailShell(
            $branding,
            $notificationLogoSource,
            'Nová správa z webu',
            $notificationDetails,
            'Odpovedzte priamo na tento e-mail a odpoveď pôjde odosielateľovi formulára.'
        );

    $notification->AltBody =
        "Nová správa z webu Humanitas\n\n" .
        "Meno: {$name}\n" .
        "E-mail: {$email}\n" .
        "Telefón: {$phone}\n\n" .
        "Správa:\n{$message}";

    $notification->send();
} catch (Exception $exception) {
    error_log(
        'Contact form notification error: ' .
        $exception->getMessage()
    );

    jsonResponse(
        [
            'message' =>
                'Správu sa nepodarilo odoslať. Skúste to prosím neskôr.'
        ],
        500
    );
}

/*
|--------------------------------------------------------------------------
| Confirmation to visitor
|--------------------------------------------------------------------------
|
| At this point the clinic already has the enquiry.
|
| If confirmation fails, do not tell the visitor that the original message
| failed and risk repeated submissions.
*/

try {
    $confirmation =
        createMailer(
            $mailConfig
        );

    $confirmation
        ->addAddress(
            $email,
            $name
        );

    $confirmation->Subject =
        'Vašu správu sme prijali';

    $confirmationLogoSource =
        embedBrandLogo(
            $confirmation,
            $branding,
            $projectRoot
        );

    $confirmationContent = <<<HTML
<table
    role="presentation"
    width="100%"
    cellpadding="0"
    cellspacing="0"
    border="0"
    style="
        width: 100%;
        border-collapse: collapse;
    "
>
    <tr>
        <td
            style="
                padding-bottom: 18px;
                color:
                    rgba(
                        51,
                        89,
                        64,
                        0.88
                    );
                font-size: 15px;
                line-height: 1.75;
            "
        >
            Dobrý deň, <strong>{$safeName}</strong>,
        </td>
    </tr>

    <tr>
        <td
            style="
                padding-bottom: 8px;
                color:
                    rgba(
                        51,
                        89,
                        64,
                        0.78
                    );
                font-size: 15px;
                line-height: 1.75;
            "
        >
            Vašu správu sme úspešne prijali. Ozveme sa vám čo najskôr
            na e-mail
            <strong>{$safeEmail}</strong>
            alebo telefonicky na
            <strong>{$safePhone}</strong>.
        </td>
    </tr>
</table>

HTML;

    $confirmationContent .=
        renderMessageBlock(
            'Vaša správa',
            $safeMessage
        );

    $confirmationContent .= <<<HTML
<table
    role="presentation"
    width="100%"
    cellpadding="0"
    cellspacing="0"
    border="0"
    style="
        width: 100%;
        margin-top: 24px;
        border-collapse: collapse;
    "
>
    <tr>
        <td
            style="
                color:
                    rgba(
                        51,
                        89,
                        64,
                        0.88
                    );
                font-size: 15px;
                line-height: 1.75;
            "
        >
            S pozdravom<br>
            <strong>Humanitas</strong>
        </td>
    </tr>
</table>
HTML;

    $confirmation->Body =
        renderEmailShell(
            $branding,
            $confirmationLogoSource,
            'Vašu správu sme prijali',
            $confirmationContent,
            'Tento e-mail bol odoslaný automaticky ako potvrdenie prijatia formulára.'
        );

    $confirmation->AltBody =
        "Dobrý deň, {$name},\n\n" .
        "vašu správu sme úspešne prijali. " .
        "Ozveme sa vám čo najskôr.\n\n" .
        "S pozdravom\n" .
        "Humanitas";

    $confirmation->send();
} catch (Exception $exception) {
    error_log(
        'Contact form confirmation error: ' .
        $exception->getMessage()
    );
}

/*
|--------------------------------------------------------------------------
| Success
|--------------------------------------------------------------------------
*/

jsonResponse([
    'message' =>
        'Správa bola odoslaná.'
]);