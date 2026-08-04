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
| JSON response
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

$requestMethod =
    $_SERVER['REQUEST_METHOD'] ??
    '';

if (
    $requestMethod ===
    'OPTIONS'
) {
    http_response_code(
        204
    );

    exit;
}

if (
    $requestMethod !==
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
| Supported locations:
|
| public/api/contact.php
| dist/api/contact.php
|
*/

$projectRoot =
    dirname(
        __DIR__,
        2
    );

$currentPublicRoot =
    dirname(
        __DIR__
    );

$autoloadPath =
    $projectRoot .
    '/vendor/autoload.php';

if (
    !is_file(
        $autoloadPath
    )
) {
    error_log(
        'Contact form: vendor/autoload.php was not found at ' .
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

/*
|--------------------------------------------------------------------------
| Configuration
|--------------------------------------------------------------------------
*/

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
        '',

    'timezone' =>
        $_ENV['MAIL_TIMEZONE'] ??
        'Europe/Bratislava'
];

$signatureConfig = [
    /*
     * Expected location:
     *
     * public/images/emailsignature.png
     *
     * After build:
     *
     * dist/images/emailsignature.png
     */
    'path' =>
        $_ENV['MAIL_SIGNATURE_PATH'] ??
        'images/emailsignature.png',

    'cid' =>
        'humanitas-email-signature',

    'width' =>
        max(
            280,
            min(
                620,
                (int) (
                    $_ENV['MAIL_SIGNATURE_WIDTH'] ??
                    430
                )
            )
        )
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
            $data['sender_name'] ??
            ''
        )
    );

$email =
    trim(
        (string) (
            $data['sender_email'] ??
            ''
        )
    );

$phone =
    trim(
        (string) (
            $data['sender_phone'] ??
            ''
        )
    );

$message =
    trim(
        (string) (
            $data['body'] ??
            ''
        )
    );

$website =
    trim(
        (string) (
            $data['website'] ??
            ''
        )
    );

$formStartedAt =
    (int) (
        $data['form_started_at'] ??
        0
    );

/*
|--------------------------------------------------------------------------
| Honeypot
|--------------------------------------------------------------------------
*/

if (
    $website !==
    ''
) {
    jsonResponse(
        [
            'message' =>
                'Správa bola odoslaná.'
        ]
    );
}

/*
|--------------------------------------------------------------------------
| Timing protection
|--------------------------------------------------------------------------
*/

if (
    $formStartedAt >
    0
) {
    $elapsed =
        time() -
        $formStartedAt;

    if (
        $elapsed >=
            0 &&
        $elapsed <
            2
    ) {
        jsonResponse(
            [
                'message' =>
                    'Správa bola odoslaná.'
            ]
        );
    }
}

/*
|--------------------------------------------------------------------------
| Validation
|--------------------------------------------------------------------------
*/

$errors = [];

if (
    $name ===
    ''
) {
    $errors['sender_name'] = [
        'Zadajte vaše meno.'
    ];
} elseif (
    mb_strlen(
        $name
    ) >
    120
) {
    $errors['sender_name'] = [
        'Meno je príliš dlhé.'
    ];
}

if (
    $email ===
        '' ||
    !filter_var(
        $email,
        FILTER_VALIDATE_EMAIL
    )
) {
    $errors['sender_email'] = [
        'Zadajte platnú e-mailovú adresu.'
    ];
} elseif (
    mb_strlen(
        $email
    ) >
    255
) {
    $errors['sender_email'] = [
        'E-mailová adresa je príliš dlhá.'
    ];
}

if (
    $phone ===
    ''
) {
    $errors['sender_phone'] = [
        'Zadajte telefónne číslo.'
    ];
} elseif (
    mb_strlen(
        $phone
    ) >
    50
) {
    $errors['sender_phone'] = [
        'Telefónne číslo je príliš dlhé.'
    ];
}

if (
    $message ===
    ''
) {
    $errors['body'] = [
        'Napíšte správu.'
    ];
} elseif (
    mb_strlen(
        $message
    ) >
    5000
) {
    $errors['body'] = [
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
| Maximum five valid submissions from one IP in ten minutes.
|
*/

function isRateLimited(
    string $ip
): bool {
    $maximumRequests =
        5;

    $windowSeconds =
        600;

    $identifier =
        hash(
            'sha256',
            $ip
        );

    $filePath =
        sys_get_temp_dir() .
        '/humanitas-contact-' .
        $identifier .
        '.json';

    $now =
        time();

    $handle =
        fopen(
            $filePath,
            'c+'
        );

    if (
        !$handle
    ) {
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
    $_SERVER['REMOTE_ADDR'] ??
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
| Helpers
|--------------------------------------------------------------------------
*/

function escapeHtml(
    string $value
): string {
    return htmlspecialchars(
        $value,
        ENT_QUOTES |
        ENT_SUBSTITUTE,
        'UTF-8'
    );
}

function formatSlovakDateTime(
    DateTimeInterface $date
): string {
    $months = [
        1 =>
            'januára',

        2 =>
            'februára',

        3 =>
            'marca',

        4 =>
            'apríla',

        5 =>
            'mája',

        6 =>
            'júna',

        7 =>
            'júla',

        8 =>
            'augusta',

        9 =>
            'septembra',

        10 =>
            'októbra',

        11 =>
            'novembra',

        12 =>
            'decembra'
    ];

    $monthNumber =
        (int) $date->format(
            'n'
        );

    $monthName =
        $months[$monthNumber] ??
        '';

    return sprintf(
        '%s. %s %s o %s',
        $date->format(
            'j'
        ),
        $monthName,
        $date->format(
            'Y'
        ),
        $date->format(
            'H:i'
        )
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
        $config['host'];

    $mailer->Port =
        $config['port'];

    $mailer->SMTPAuth =
        true;

    $mailer->Username =
        $config['username'];

    $mailer->Password =
        $config['password'];

    $encryption =
        strtolower(
            (string) $config['encryption']
        );

    if (
        $encryption ===
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
        $config['from_address'],
        $config['from_name']
    );

    $mailer->isHTML(
        true
    );

    return $mailer;
}

/*
|--------------------------------------------------------------------------
| Signature image
|--------------------------------------------------------------------------
*/

function resolveSignaturePath(
    string $projectRoot,
    string $currentPublicRoot,
    string $configuredPath
): ?string {
    $configuredPath =
        trim(
            $configuredPath
        );

    $candidates = [];

    if (
        $configuredPath !==
        ''
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
            $relativePath =
                ltrim(
                    $configuredPath,
                    '/'
                );

            $candidates[] =
                $currentPublicRoot .
                '/' .
                $relativePath;

            $candidates[] =
                $projectRoot .
                '/' .
                $relativePath;

            $candidates[] =
                $projectRoot .
                '/public/' .
                $relativePath;

            $candidates[] =
                $projectRoot .
                '/dist/' .
                $relativePath;
        }
    }

    $candidates[] =
        $currentPublicRoot .
        '/images/emailsignature.png';

    $candidates[] =
        $projectRoot .
        '/public/images/emailsignature.png';

    $candidates[] =
        $projectRoot .
        '/dist/images/emailsignature.png';

    foreach (
        array_unique(
            $candidates
        ) as $candidate
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

function embedEmailSignature(
    PHPMailer $mailer,
    array $signatureConfig,
    string $projectRoot,
    string $currentPublicRoot
): ?string {
    $signaturePath =
        resolveSignaturePath(
            $projectRoot,
            $currentPublicRoot,
            (string) $signatureConfig['path']
        );

    if (
        !$signaturePath
    ) {
        error_log(
            'Contact form: images/emailsignature.png was not found.'
        );

        return null;
    }

    $extension =
        strtolower(
            pathinfo(
                $signaturePath,
                PATHINFO_EXTENSION
            )
        );

    $mimeType =
        match (
            $extension
        ) {
            'jpg',
            'jpeg' =>
                'image/jpeg',

            'webp' =>
                'image/webp',

            'gif' =>
                'image/gif',

            default =>
                'image/png'
        };

    $contentId =
        (string) $signatureConfig['cid'];

    $mailer->addEmbeddedImage(
        $signaturePath,
        $contentId,
        basename(
            $signaturePath
        ),
        'base64',
        $mimeType
    );

    return (
        'cid:' .
        $contentId
    );
}

function renderSignatureImage(
    ?string $signatureSource,
    int $width,
    int $topMargin = 42
): string {
    if (
        !$signatureSource
    ) {
        return <<<HTML
<div
    style="
        margin-top: {$topMargin}px;
        color: #335940;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 14px;
        line-height: 1.6;
    "
>
    S pozdravom,<br>
    <strong>Humanitas</strong>
</div>
HTML;
    }

    $safeSource =
        escapeHtml(
            $signatureSource
        );

    return <<<HTML
<img
    src="{$safeSource}"
    width="{$width}"
    alt="Humanitas"
    style="
        display: block;
        width: {$width}px;
        max-width: 100%;
        height: auto;
        margin: {$topMargin}px 0 0;
        padding: 0;
        border: 0;
        outline: none;
        text-decoration: none;
    "
>
HTML;
}

/*
|--------------------------------------------------------------------------
| Minimal Gmail-like email shell
|--------------------------------------------------------------------------
*/

function renderRegularEmail(
    string $documentTitle,
    string $content
): string {
    $safeDocumentTitle =
        escapeHtml(
            $documentTitle
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
        background-color: #ffffff;
        color: #202124;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 14px;
        line-height: 1.55;
        -webkit-text-size-adjust: 100%;
        -ms-text-size-adjust: 100%;
    "
>
    <div
        style="
            margin: 0;
            padding: 0;
            background-color: #ffffff;
            color: #202124;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 14px;
            line-height: 1.55;
        "
    >
        {$content}
    </div>
</body>
</html>
HTML;
}

/*
|--------------------------------------------------------------------------
| Safe message values
|--------------------------------------------------------------------------
*/

$safeName =
    escapeHtml(
        $name
    );

$safeEmail =
    escapeHtml(
        $email
    );

$safePhone =
    escapeHtml(
        $phone
    );

$safeMessage =
    nl2br(
        escapeHtml(
            $message
        )
    );

$safeEmailHref =
    escapeHtml(
        'mailto:' .
        $email
    );

$phoneHrefValue =
    preg_replace(
        '/[^\d+]/',
        '',
        $phone
    ) ?: '';

$safePhoneHref =
    $phoneHrefValue !==
        ''
        ? escapeHtml(
            'tel:' .
            $phoneHrefValue
        )
        : null;

try {
    $timezone =
        new DateTimeZone(
            (string) $mailConfig['timezone']
        );
} catch (Throwable) {
    $timezone =
        new DateTimeZone(
            'Europe/Bratislava'
        );
}

$sentAt =
    new DateTimeImmutable(
        'now',
        $timezone
    );

$safeSentAt =
    escapeHtml(
        formatSlovakDateTime(
            $sentAt
        )
    );

/*
|--------------------------------------------------------------------------
| Internal notification to Humanitas
|--------------------------------------------------------------------------
*/

try {
    $notification =
        createMailer(
            $mailConfig
        );

    $notification->addAddress(
        $mailConfig['contact_to']
    );

    /*
     * Clicking Reply in Gmail replies directly
     * to the person who submitted the form.
     */
    $notification->addReplyTo(
        $email,
        $name
    );

    $notification->Subject =
        'Nová správa z webu';

    $notificationSignatureSource =
        embedEmailSignature(
            $notification,
            $signatureConfig,
            $projectRoot,
            $currentPublicRoot
        );

    $notificationSignatureHtml =
        renderSignatureImage(
            $notificationSignatureSource,
            (int) $signatureConfig['width'],
            34
        );

    $phoneHtml =
        $safePhone;

    if (
        $safePhoneHref
    ) {
        $phoneHtml = <<<HTML
<a
    href="{$safePhoneHref}"
    style="
        color: #202124;
        text-decoration: none;
    "
>
    {$safePhone}
</a>
HTML;
    }

    $notificationContent = <<<HTML
<p
    style="
        margin: 0 0 18px;
    "
>
    Dobrý deň,
</p>

<p
    style="
        margin: 0 0 16px;
    "
>
    prostredníctvom kontaktného formulára na webovej stránke bol odoslaný nový dopyt.
</p>

<p
    style="
        margin: 0 0 16px;
    "
>
    <strong>Meno:</strong> {$safeName}<br>
    <strong>Telefón:</strong> {$phoneHtml}<br>
    <strong>E-mail:</strong>
    <a
        href="{$safeEmailHref}"
        style="
            color: #1155cc;
            text-decoration: underline;
        "
    >
        {$safeEmail}
    </a>
</p>

<p
    style="
        margin: 0 0 16px;
    "
>
    <strong>Správa:</strong><br>
    {$safeMessage}
</p>

<p
    style="
        margin: 0;
    "
>
    <strong>Odoslané:</strong> {$safeSentAt}
</p>

{$notificationSignatureHtml}
HTML;

    $notification->Body =
        renderRegularEmail(
            'Nová správa z webu',
            $notificationContent
        );

    $notification->AltBody =
        "Dobrý deň,\n\n" .
        "prostredníctvom kontaktného formulára na webovej stránke bol odoslaný nový dopyt.\n\n" .
        "Meno: {$name}\n" .
        "Telefón: {$phone}\n" .
        "E-mail: {$email}\n\n" .
        "Správa:\n{$message}\n\n" .
        "Odoslané: " .
        formatSlovakDateTime(
            $sentAt
        ) .
        "\n\n" .
        "S pozdravom,\nHumanitas";

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
| Confirmation to the visitor
|--------------------------------------------------------------------------
*/

try {
    $confirmation =
        createMailer(
            $mailConfig
        );

    $confirmation->addAddress(
        $email,
        $name
    );

    $confirmation->Subject =
        'Vašu správu sme prijali';

    $confirmationSignatureSource =
        embedEmailSignature(
            $confirmation,
            $signatureConfig,
            $projectRoot,
            $currentPublicRoot
        );

    $confirmationSignatureHtml =
        renderSignatureImage(
            $confirmationSignatureSource,
            (int) $signatureConfig['width'],
            50
        );

    $confirmationContent = <<<HTML
<p
    style="
        margin: 0 0 18px;
    "
>
    Dobrý deň, {$safeName},
</p>

<p
    style="
        margin: 0 0 18px;
    "
>
    ďakujeme za Vašu správu. Úspešne sme ju prijali a ozveme sa Vám hneď, ako to bude možné.
</p>

<p
    style="
        margin: 0;
    "
>
    Dovtedy Vám prajeme všetko dobré.
</p>

{$confirmationSignatureHtml}
HTML;

    $confirmation->Body =
        renderRegularEmail(
            'Vašu správu sme prijali',
            $confirmationContent
        );

    $confirmation->AltBody =
        "Dobrý deň, {$name},\n\n" .
        "ďakujeme za Vašu správu. Úspešne sme ju prijali a ozveme sa Vám hneď, ako to bude možné.\n\n" .
        "Dovtedy Vám prajeme všetko dobré.\n\n" .
        "S pozdravom,\nHumanitas";

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

jsonResponse(
    [
        'message' =>
            'Správa bola odoslaná.'
    ]
);