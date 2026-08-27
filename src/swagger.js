/**
 * OpenAPI 3.0 спецификация API сервиса.
 * Используется вместе с swagger-ui-express для отображения документации.
 */

const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Encrypted Pastebin API',
    version: '1.0.0',
    description:
      'Web-сервис для создания зашифрованных текстовых записей. ' +
      'Аутентификация выполняется через cookie-сессии (Connect.SID).',
  },
  servers: [
    {
      url: '/',
      description: 'Текущий сервер',
    },
  ],
  paths: {
    '/api/auth/config': {
      get: {
        tags: ['Auth'],
        summary: 'Публичная конфигурация',
        description: 'Возвращает настройки сервиса, в частности доступна ли регистрация.',
        responses: {
          200: {
            description: 'Конфигурация',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ConfigResponse' },
              },
            },
          },
        },
      },
    },
    '/api/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Регистрация нового пользователя',
        description:
          'Создаёт пользователя и автоматически выполняет вход. Может быть отключена настройкой REGISTRATION_DISABLED.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Credentials' },
            },
          },
        },
        responses: {
          201: {
            description: 'Пользователь успешно зарегистрирован',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UserResponse' },
              },
            },
          },
          400: {
            description: 'Некорректные данные (пустые поля или неверная длина)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          403: {
            description: 'Регистрация отключена',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          409: {
            description: 'Пользователь с таким именем уже существует',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Вход в систему',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Credentials' },
            },
          },
        },
        responses: {
          200: {
            description: 'Успешный вход',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UserResponse' },
              },
            },
          },
          400: {
            description: 'Не указаны имя пользователя или пароль',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          401: {
            description: 'Неверное имя пользователя или пароль',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Текущий авторизованный пользователь',
        responses: {
          200: {
            description: 'Данные текущего пользователя',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UserResponse' },
              },
            },
          },
          401: {
            description: 'Не авторизован',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Выход из системы',
        responses: {
          200: {
            description: 'Сессия завершена',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/OkResponse' },
              },
            },
          },
        },
      },
    },
    '/api/pastes': {
      post: {
        tags: ['Pastes'],
        summary: 'Создание записи',
        description:
          'Шифрует содержимое, сохраняет файл и возвращает ссылку на запись. Требуется авторизация.',
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreatePasteRequest' },
            },
          },
        },
        responses: {
          201: {
            description: 'Запись создана',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreatePasteResponse' },
              },
            },
          },
          400: {
            description: 'Пустое содержимое записи',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          401: {
            description: 'Требуется авторизация',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
      get: {
        tags: ['Pastes'],
        summary: 'Лента публичных записей',
        description:
          'Возвращает неприватные записи всех пользователей с указанием автора. Требуется авторизация.',
        security: [{ cookieAuth: [] }],
        responses: {
          200: {
            description: 'Список публичных записей',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PastesListResponse' },
              },
            },
          },
          401: {
            description: 'Требуется авторизация',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/pastes/mine': {
      get: {
        tags: ['Pastes'],
        summary: 'Список записей текущего пользователя',
        security: [{ cookieAuth: [] }],
        responses: {
          200: {
            description: 'Список записей',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PastesListResponse' },
              },
            },
          },
          401: {
            description: 'Требуется авторизация',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/pastes/{slug}': {
      get: {
        tags: ['Pastes'],
        summary: 'Просмотр записи по slug',
        description: 'Расшифровывает и возвращает текст записи. Требуется авторизация.',
        security: [{ cookieAuth: [] }],
        parameters: [
          {
            name: 'slug',
            in: 'path',
            required: true,
            description: 'Короткий идентификатор записи',
            schema: { type: 'string' },
          },
        ],
        responses: {
          200: {
            description: 'Содержимое записи',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PasteViewResponse' },
              },
            },
          },
          403: {
            description: 'Доступ к приватной записи запрещён (только автор)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          401: {
            description: 'Требуется авторизация',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          404: {
            description: 'Запись не найдена',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          500: {
            description: 'Ошибка при расшифровке записи',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
      put: {
        tags: ['Pastes'],
        summary: 'Редактирование записи',
        description:
          'Обновляет содержимое записи (перешифровывает текст), а также заголовок, приватность и признак публичного скачивания (public_download — только для автора записи). Неприватные записи может редактировать любой зарегистрированный пользователь; приватные — только их автор.',
        security: [{ cookieAuth: [] }],
        parameters: [
          {
            name: 'slug',
            in: 'path',
            required: true,
            description: 'Короткий идентификатор записи',
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreatePasteRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Запись обновлена',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/OkResponse' },
              },
            },
          },
          403: {
            description: 'Доступ к приватной записи запрещён (только автор)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          400: {
            description: 'Пустое содержимое записи',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          401: {
            description: 'Требуется авторизация',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          404: {
            description: 'Запись не найдена',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Pastes'],
        summary: 'Удаление записи',
        description: 'Удаляет запись. Доступно только её автору (создателю).',
        security: [{ cookieAuth: [] }],
        parameters: [
          {
            name: 'slug',
            in: 'path',
            required: true,
            description: 'Короткий идентификатор записи',
            schema: { type: 'string' },
          },
        ],
        responses: {
          200: {
            description: 'Запись удалена',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/OkResponse' },
              },
            },
          },
          403: {
            description: 'Удалять запись может только её автор',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          401: {
            description: 'Требуется авторизация',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          404: {
            description: 'Запись не найдена',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/pastes/{slug}/download': {
      get: {
        tags: ['Pastes'],
        summary: 'Скачать запись текстовым файлом',
        description:
          'Возвращает расшифрованный текст как файл .txt. Требуется авторизация, кроме случая, когда у неприватной записи включён параметр public_download — тогда доступна по прямой ссылке без авторизации.',
        security: [{ cookieAuth: [] }],
        parameters: [
          {
            name: 'slug',
            in: 'path',
            required: true,
            description: 'Короткий идентификатор записи',
            schema: { type: 'string' },
          },
        ],
        responses: {
          200: {
            description: 'Текстовый файл записи',
            content: {
              'text/plain': { schema: { type: 'string' } },
            },
          },
          403: {
            description: 'Доступ к приватной записи запрещён (только автор)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          401: {
            description:
              'Требуется авторизация (запись без public_download или приватная)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          404: {
            description: 'Запись не найдена',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          500: {
            description: 'Ошибка при расшифровке записи',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/link/{slug}': {
      get: {
        tags: ['Link'],
        summary: 'Полная ссылка на запись',
        description: 'Возвращает полный URL страницы просмотра записи с учётом BASE_URL.',
        parameters: [
          {
            name: 'slug',
            in: 'path',
            required: true,
            description: 'Короткий идентификатор записи',
            schema: { type: 'string' },
          },
        ],
        responses: {
          200: {
            description: 'Полная ссылка',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LinkResponse' },
              },
            },
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'connect.sid',
        description: 'Cookie-сессия, устанавливается после регистрации или входа.',
      },
    },
    schemas: {
      Credentials: {
        type: 'object',
        required: ['username', 'password'],
        properties: {
          username: {
            type: 'string',
            minLength: 3,
            example: 'alice',
            description: 'Имя пользователя (минимум 3 символа)',
          },
          password: {
            type: 'string',
            minLength: 6,
            example: 'secret123',
            description: 'Пароль (минимум 6 символов)',
          },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          username: { type: 'string', example: 'alice' },
        },
      },
      UserResponse: {
        type: 'object',
        properties: {
          user: { $ref: '#/components/schemas/User' },
        },
      },
      CreatePasteRequest: {
        type: 'object',
        required: ['content'],
        properties: {
          content: {
            type: 'string',
            description: 'Текст записи для шифрования',
            example: 'Секретное сообщение',
          },
          title: {
            type: 'string',
            description: 'Необязательный заголовок записи',
            example: 'Мои заметки',
          },
          private: {
            type: 'boolean',
            description: 'Приватная запись (видна и редактируется только автором). По умолчанию false',
            default: false,
            example: false,
          },
          public_download: {
            type: 'boolean',
            description:
              'Разрешить скачивание файла записи по прямой ссылке без авторизации (для неприватных записей). По умолчанию false',
            default: false,
            example: false,
          },
        },
      },
      CreatePasteResponse: {
        type: 'object',
        properties: {
          paste: {
            type: 'object',
            properties: {
              slug: { type: 'string', example: 'aB3xY9zQ' },
              url: { type: 'string', example: '/p/aB3xY9zQ' },
              private: { type: 'boolean', example: false },
              public_download: { type: 'boolean', example: false },
            },
          },
        },
      },
      PastesListResponse: {
        type: 'object',
        properties: {
          pastes: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                slug: { type: 'string', example: 'aB3xY9zQ' },
                title: { type: 'string', example: 'Мои заметки', nullable: true },
                created_at: { type: 'string', example: '2026-08-27 10:00:00' },
                private: { type: 'boolean', example: false },
                public_download: {
                  type: 'boolean',
                  example: false,
                  description: 'Разрешено ли скачивание файла по ссылке без авторизации',
                },
                author: {
                  type: 'string',
                  example: 'alice',
                  description: 'Имя автора записи (присутствует в публичной ленте)',
                },
              },
            },
          },
        },
      },
      PasteViewResponse: {
        type: 'object',
        properties: {
          paste: {
            type: 'object',
            properties: {
              slug: { type: 'string', example: 'aB3xY9zQ' },
              title: { type: 'string', example: 'Мои заметки', nullable: true },
              created_at: { type: 'string', example: '2026-08-27 10:00:00' },
              private: { type: 'boolean', example: false },
              public_download: { type: 'boolean', example: false },
              author: { type: 'string', example: 'alice' },
            },
          },
          content: { type: 'string', example: 'Секретное сообщение' },
        },
      },
      LinkResponse: {
        type: 'object',
        properties: {
          url: { type: 'string', example: 'https://example.com/p/aB3xY9zQ' },
        },
      },
      ConfigResponse: {
        type: 'object',
        properties: {
          registrationEnabled: { type: 'boolean', example: true },
        },
      },
      OkResponse: {
        type: 'object',
        properties: {
          ok: { type: 'boolean', example: true },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          error: { type: 'string', example: 'Описание ошибки' },
        },
      },
    },
  },
};

module.exports = swaggerSpec;