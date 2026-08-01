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
| Return success intentionally so a bot does
| not learn that it has been detected.
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
| Submitting a full form in less than two seconds
| is extremely unlikely for a human.
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
| Maximum 5 real submissions from one IP
| during a 10 minute window.
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
         * If temporary storage is unavailable,
         * don't prevent legitimate submissions.
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
     * Gmail still sees the authenticated
     * Gmail account as the sender.
     *
     * Reply in Gmail goes directly to
     * the visitor.
     */
    $notification
        ->addReplyTo(
            $email,
            $name
        );

    $notification->Subject =
        'Nová správa z webu – ' .
        $name;

    $notification->Body = <<<HTML
<!DOCTYPE html>
<html lang="sk">
<head>
    <meta charset="UTF-8">
    <meta
        name="viewport"
        content="width=device-width, initial-scale=1"
    >
</head>

<body
    style="
        margin: 0;
        padding: 0;
        background: #FBF9F3;
        color: #335940;
        font-family:
            Arial,
            Helvetica,
            sans-serif;
    "
>
    <div
        style="
            padding: 32px 16px;
        "
    >
        <div
            style="
                max-width: 620px;
                margin: 0 auto;
                background: #ffffff;
                border-radius: 28px;
                overflow: hidden;
            "
        >
            <div
                style="
                    padding: 34px;
                "
            >
                <p
                    style="
                        margin: 0 0 8px;
                        color: rgba(
                            51,
                            89,
                            64,
                            0.55
                        );
                        font-size: 13px;
                        font-weight: 700;
                        letter-spacing: 0.08em;
                        text-transform: uppercase;
                    "
                >
                    Humanitas
                </p>

                <h1
                    style="
                        margin: 0;
                        color: #335940;
                        font-size: 28px;
                        line-height: 1.15;
                    "
                >
                    Nová správa z webu
                </h1>

                <div
                    style="
                        margin-top: 30px;
                    "
                >
                    <p
                        style="
                            margin: 0 0 18px;
                            line-height: 1.6;
                        "
                    >
                        <strong>Meno</strong><br>
                        {$safeName}
                    </p>

                    <p
                        style="
                            margin: 0 0 18px;
                            line-height: 1.6;
                        "
                    >
                        <strong>E-mail</strong><br>

                        <a
                            href="mailto:{$safeEmail}"
                            style="
                                color: #335940;
                            "
                        >
                            {$safeEmail}
                        </a>
                    </p>

                    <p
                        style="
                            margin: 0;
                            line-height: 1.6;
                        "
                    >
                        <strong>Telefón</strong><br>
                        {$safePhone}
                    </p>
                </div>

                <div
                    style="
                        margin-top: 30px;
                        padding-top: 26px;
                        border-top:
                            1px solid
                            rgba(
                                51,
                                89,
                                64,
                                0.14
                            );
                    "
                >
                    <p
                        style="
                            margin: 0 0 12px;
                            font-weight: 700;
                        "
                    >
                        Správa
                    </p>

                    <div
                        style="
                            line-height: 1.75;
                            color: rgba(
                                51,
                                89,
                                64,
                                0.82
                            );
                        "
                    >
                        {$safeMessage}
                    </div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
HTML;

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
| At this point the clinic already has the
| enquiry.
|
| If confirmation fails, don't tell the user
| that their original message failed and risk
| them submitting it repeatedly.
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

    $confirmation->Body = <<<HTML
<!DOCTYPE html>
<html lang="sk">
<head>
    <meta charset="UTF-8">
    <meta
        name="viewport"
        content="width=device-width, initial-scale=1"
    >
</head>

<body
    style="
        margin: 0;
        padding: 0;
        background: #FBF9F3;
        color: #335940;
        font-family:
            Arial,
            Helvetica,
            sans-serif;
    "
>
    <div
        style="
            padding: 32px 16px;
        "
    >
        <div
            style="
                max-width: 620px;
                margin: 0 auto;
                background: #ffffff;
                border-radius: 28px;
                overflow: hidden;
            "
        >
            <div
                style="
                    padding: 34px;
                "
            >
                <p
                    style="
                        margin: 0 0 8px;
                        color: rgba(
                            51,
                            89,
                            64,
                            0.55
                        );
                        font-size: 13px;
                        font-weight: 700;
                        letter-spacing: 0.08em;
                        text-transform: uppercase;
                    "
                >
                    Humanitas
                </p>

                <h1
                    style="
                        margin: 0;
                        color: #335940;
                        font-size: 28px;
                        line-height: 1.15;
                    "
                >
                    Ďakujeme za vašu správu
                </h1>

                <p
                    style="
                        margin: 26px 0 0;
                        line-height: 1.75;
                    "
                >
                    Dobrý deň,
                    {$safeName},
                </p>

                <p
                    style="
                        margin: 14px 0 0;
                        line-height: 1.75;
                    "
                >
                    vašu správu sme úspešne
                    prijali. Ozveme sa vám čo
                    najskôr.
                </p>

                <div
                    style="
                        margin-top: 28px;
                        padding: 22px;
                        border-radius: 20px;
                        background: #FBF9F3;
                    "
                >
                    <p
                        style="
                            margin: 0 0 10px;
                            font-weight: 700;
                        "
                    >
                        Vaša správa
                    </p>

                    <div
                        style="
                            line-height: 1.75;
                            color: rgba(
                                51,
                                89,
                                64,
                                0.76
                            );
                        "
                    >
                        {$safeMessage}
                    </div>
                </div>

                <p
                    style="
                        margin: 30px 0 0;
                        line-height: 1.75;
                    "
                >
                    S pozdravom<br>

                    <strong>
                        Humanitas
                    </strong>
                </p>
            </div>
        </div>
    </div>
</body>
</html>
HTML;

    $confirmation->AltBody =
        "Dobrý deň, {$name},\n\n" .
        "vašu správu sme úspešne prijali. " .
        "Ozveme sa vám čo najskôr.\n\n" .
        "Vaša správa:\n{$message}\n\n" .
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