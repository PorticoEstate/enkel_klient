# PHP Slim + Twig Web Application Setup Guide

This guide describes how to create a PHP web application from scratch using Slim Framework and Twig templating. The application will include a landing page, a navigation menu, a form, and a list of items.

---

## 1. Prerequisites

- Linux OS with bash shell
- PHP (>=8.0)
- Composer (PHP dependency manager)
- Docker & Docker Compose (recommended for local development)
- Git (optional, for version control)

---

## 2. Project Structure

Create the following directory structure:

```
project-root/
│
├── composer.json
├── composer.lock
├── Dockerfile
├── docker-compose.yml
├── index.php
├── README.md
├── logs/
├── public/
├── src/
│   ├── configs/
│   ├── Controller/
│   ├── css/
│   ├── icon/
│   ├── js/
│   ├── routes/
│   ├── Service/
│   ├── templates/
│   └── translations/
└── vendor/
```

---

## 3. Initialize Composer and Install Dependencies

```bash
composer init
composer require slim/slim:"^4.0" slim/psr7 twig/twig slim/twig-view
```

---

## 4. Docker Setup (Optional)

**Dockerfile**
```Dockerfile
FROM php:8.2-apache
RUN docker-php-ext-install pdo pdo_pgsql
COPY . /var/www/html/
WORKDIR /var/www/html
RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer
RUN composer install
```

**docker-compose.yml**
```yaml
version: '3.8'
services:
  web:
    build: .
    ports:
      - "8080:80"
    volumes:
      - .:/var/www/html
    environment:
      - APACHE_DOCUMENT_ROOT=/var/www/html/public
```

---

## 5. Application Entry Point

**index.php** (in project root or `public/`):

- Bootstrap Slim app
- Set up Twig as the view renderer
- Register routes

Example:
```php
<?php
require __DIR__ . '/vendor/autoload.php';

use Slim\Factory\AppFactory;
use Slim\Views\Twig;
use Slim\Views\TwigMiddleware;

$app = AppFactory::create();
$twig = Twig::create(__DIR__ . '/src/templates', ['cache' => false]);
$app->add(TwigMiddleware::create($app, $twig));

// Register routes
(require __DIR__ . '/src/routes/web.php')($app);

$app->run();
```

---

## 6. Routing

**src/routes/web.php**
```php
<?php
use Slim\App;
use App\Controller\LandingController;
use App\Controller\FormController;
use App\Controller\ListController;

return function (App $app) {
    $app->get('/', [LandingController::class, 'index']);
    $app->get('/form', [FormController::class, 'show']);
    $app->post('/form', [FormController::class, 'submit']);
    $app->get('/list', [ListController::class, 'index']);
    $app->get('/entity/{id}', [FormController::class, 'view']);
};
```

---

## 7. Controllers

Create controllers in `src/Controller/`:

- `LandingController.php`
- `FormController.php`
- `ListController.php`

Example for `FormController.php`:
```php
<?php
namespace App\Controller;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Slim\Views\Twig;

class FormController {
    public function show(Request $request, Response $response, $args) {
        return Twig::fromRequest($request)->render($response, 'form.twig');
    }

    public function submit(Request $request, Response $response, $args) {
        $data = $request->getParsedBody();
        // Validate and process $data
        return Twig::fromRequest($request)->render($response, 'form.twig', [
            'success' => true,
            'data' => $data
        ]);
    }
}
```

---

## 8. Templates (Twig)

Place Twig templates in `src/templates/`:

- `layout.twig` (base layout with menu)
- `landing.twig` (landing page)
- `form.twig` (form page)
- `list.twig` (list of items)
- `head.twig` (HTML head section)
- `error.twig` (error handling)

Example for `form.twig`:
```twig
{% extends "layout.twig" %}
{% block content %}
<h2>Example Form</h2>
{% if success %}
    <div class="alert alert-success">Form submitted successfully!</div>
{% endif %}
<form method="post" action="/form">
    <label>Name: <input type="text" name="name" value="{{ data.name|default('') }}"></label><br>
    <label>Email: <input type="email" name="email" value="{{ data.email|default('') }}"></label><br>
    <button type="submit">Submit</button>
</form>
{% endblock %}
```

---

## 9. Static Assets

- Place CSS in `src/css/`
- Place JS in `src/js/`
- Place icons/images in `src/icon/` and `src/css/images/`

---

## 10. Logging

- Configure logging to write to the `logs/` directory.

---

## 11. Documentation

- Write usage and setup instructions in `README.md`.

---

## 12. Running the Application

- If using Docker:
  ```bash
  docker-compose up --build
  ```
- If running locally:
  ```bash
  php -S localhost:8080 -t public
  ```

---

## 13. Implementing a Simple Form

- Route: `/form`
- Controller: `FormController.php`
- Template: `form.twig`
- Functionality:
  - GET: Show form (e.g., name, email)
  - POST: Validate and process input, then show confirmation or errors

---

## 14. Extending the Application

- Add more controllers and routes for additional forms and lists.
- Use Twig templates for all views.
- Add authentication, database integration, and other features as needed.

---

## 15. Configurable Entity Attributes and Dynamic Forms

To support entities with configurable attributes (in addition to a mandatory `id`), follow these steps:

### 15.1. Define Attribute Configuration

In your controller (or a config file), define an array describing each attribute:

```php
$entityAttributes = [
    [
        'name' => 'id',
        'datatype' => 'integer',
        'description' => 'Unique identifier',
        'form_name' => 'ID',
        'html_element' => 'hidden'
    ],
    [
        'name' => 'title',
        'datatype' => 'text',
        'description' => 'Short title',
        'form_name' => 'Title',
        'html_element' => 'textfield'
    ],
    [
        'name' => 'description',
        'datatype' => 'long_text',
        'description' => 'Detailed description',
        'form_name' => 'Description',
        'html_element' => 'textarea'
    ],
    [
        'name' => 'due_date',
        'datatype' => 'date',
        'description' => 'Due date',
        'form_name' => 'Due Date',
        'html_element' => 'datepicker'
    ]
];
```

- `datatype`: e.g., integer, text, long_text, date
- `name`: internal name
- `description`: help text or tooltip
- `form_name`: label in the form
- `html_element`: textfield, textarea, datepicker, hidden, etc.

### 15.1.1. Recommended Additional Qualities for `$entityAttributes`

To make your entities and forms more robust and flexible, consider adding these qualities to each attribute definition:

- `required` (bool): Whether the field is mandatory.
- `default` (mixed): Default value if not set.
- `readonly` (bool): If true, field is shown but not editable.
- `options` (array): For select/radio fields, the available choices.
- `validation` (string/array): Validation rules or regex pattern.
- `min`, `max`, `length` (int): For numeric or text fields, min/max values or length.
- `placeholder` (string): Placeholder text for form fields.
- `help_text` (string): Additional help or tooltip for the user.
- `visible` (bool): Whether the field should be shown in the form or list.
- `unique` (bool): Whether the value must be unique in the database.
- `sortable` (bool): If the field can be used for sorting in lists.
- `searchable` (bool): If the field can be used in search/filtering.
- `form_order` (int): To control the order of fields in the form.
- `list_order` (int): To control the order of fields in list views.
- `css_class` (string): Custom CSS class for styling the field.

**Example attribute with extended qualities:**

```php
[
    'name' => 'priority',
    'datatype' => 'integer',
    'description' => 'Priority (1-5)',
    'form_name' => 'Priority',
    'html_element' => 'textfield',
    'required' => true,
    'default' => 1,
    'min' => 1,
    'max' => 5,
    'placeholder' => 'Enter priority (1-5)',
    'help_text' => 'Set the priority for this task.',
    'visible' => true,
    'unique' => false,
    'sortable' => true,
    'searchable' => true,
    'form_order' => 4,
    'list_order' => 2,
    'css_class' => 'priority-field'
]
```

### 15.1.2. Defining Entity Relations for Automatic Query Building

To enable automatic rule-based query building with JOINs on related tables, define each entity in a dedicated Model (e.g., in `src/Model/`). Each model should include:
- Custom attributes (as described above)
- Relations to other entities (one-to-one, one-to-many, many-to-many)

**Recommended structure for a model:**

```php
$projectModel = [
    'attributes' => [
        // ...attribute definitions as above...
    ],
    'relations' => [
        [
            'type' => 'one_to_many',
            'entity' => 'Task',
            'local_key' => 'id',
            'foreign_key' => 'project_id',
            'label' => 'Tasks'
        ],
        // Add more relations as needed
    ]
];

$taskModel = [
    'attributes' => [
        // ...attribute definitions as above...
    ],
    'relations' => [
        [
            'type' => 'many_to_one',
            'entity' => 'Project',
            'local_key' => 'project_id',
            'foreign_key' => 'id',
            'label' => 'Project'
        ],
        [
            'type' => 'many_to_many',
            'entity' => 'User',
            'pivot_table' => 'task_user',
            'local_key' => 'task_id',
            'foreign_key' => 'user_id',
            'label' => 'Assigned Users'
        ]
    ]
];
```

**Relation types:**
- `one_to_one`
- `one_to_many`
- `many_to_one`
- `many_to_many`

**How to use:**
- Store each entity model in a separate file in `src/Model/` (e.g., `ProjectModel.php`, `TaskModel.php`).
- Use the `relations` array to automatically build JOINs or subqueries in your queries.
- Use the `relations` definition to generate select fields, multi-selects, or related entity lists in your forms and views.

This approach allows you to:
- Keep all entity metadata (attributes and relations) in one place
- Build dynamic queries and forms based on the model definition
- Easily extend your application with new entities and relationships

### 15.2. Dynamic Form Rendering in Controller

- Pass the `$entityAttributes` array to the Twig template.
- On POST, validate each field based on its datatype.

### 15.3. Dynamic Form Rendering in Twig

Example for `form.twig`:

```twig
<form method="post">
    {% for attr in entityAttributes %}
        {% if attr.html_element == 'hidden' %}
            <input type="hidden" name="{{ attr.name }}" value="{{ data[attr.name]|default('') }}">
        {% elseif attr.html_element == 'textfield' %}
            <label>{{ attr.form_name }}: <input type="text" name="{{ attr.name }}" value="{{ data[attr.name]|default('') }}"></label>
        {% elseif attr.html_element == 'textarea' %}
            <label>{{ attr.form_name }}:<br>
                <textarea name="{{ attr.name }}">{{ data[attr.name]|default('') }}</textarea>
            </label>
        {% elseif attr.html_element == 'datepicker' %}
            <label>{{ attr.form_name }}: <input type="date" name="{{ attr.name }}" value="{{ data[attr.name]|default('') }}"></label>
        {% endif %}
        <small>{{ attr.description }}</small><br>
    {% endfor %}
    <button type="submit">Submit</button>
</form>
```

### 15.4. Example Usage

- Define the attribute configuration in your controller.
- Pass it to the Twig template along with any form data.
- Render the form fields dynamically as shown above.
- On form submission, validate and process each field according to its datatype.

---

## 15.5. Example: Multiple Entity Types with Configurable Attributes

Suppose you have two entity types: `Project` and `Task`. Each has its own set of attributes and corresponding views, add/edit, and list pages.


### Routing Example

Add routes for each entity type in `src/routes/web.php`:

```php
// Project routes
$app->get('/projects', [ProjectController::class, 'list']);
$app->get('/project/add', [ProjectController::class, 'add']);
$app->post('/project/add', [ProjectController::class, 'add']);
$app->get('/project/{id}', [ProjectController::class, 'view']);
$app->get('/project/{id}/edit', [ProjectController::class, 'edit']);
$app->post('/project/{id}/edit', [ProjectController::class, 'edit']);

// Task routes
$app->get('/tasks', [TaskController::class, 'list']);
$app->get('/task/add', [TaskController::class, 'add']);
$app->post('/task/add', [TaskController::class, 'add']);
$app->get('/task/{id}', [TaskController::class, 'view']);
$app->get('/task/{id}/edit', [TaskController::class, 'edit']);
$app->post('/task/{id}/edit', [TaskController::class, 'edit']);
```

### Controller Example

Each controller (e.g., `ProjectController`, `TaskController`) should:
- Use its own `$entityAttributes` array
- Pass the attributes to the Twig template for dynamic form rendering
- Implement `list`, `add`, `edit`, and `view` methods

### Twig Templates

- Create separate Twig templates for each entity type (e.g., `project_form.twig`, `project_list.twig`, `project_view.twig`, `task_form.twig`, etc.)
- Use the dynamic form rendering pattern from above, passing the appropriate `$entityAttributes` for each entity type

---

## 16. Adding PostgreSQL as Database Backend

### 16.1. Update Docker Compose

Add a PostgreSQL service to your `docker-compose.yml`:

```yaml
services:
  web:
    # ...existing config...
  db:
    image: postgres:15
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: myuser
      POSTGRES_PASSWORD: mypassword
    ports:
      - "5432:5432"
    volumes:
      - db_data:/var/lib/postgresql/data
volumes:
  db_data:
```

### 16.2. Install PHP PostgreSQL Extension

In your `Dockerfile`, add:

```Dockerfile
RUN docker-php-ext-install pdo_pgsql
```

### 16.3. Configure Database Connection

Add your database connection settings to a config file (e.g., `src/configs/env-eksempel` or `.env`):

```
DB_DRIVER=pgsql
DB_HOST=db
DB_PORT=5432
DB_DATABASE=myapp
DB_USERNAME=myuser
DB_PASSWORD=mypassword
```

Use a library like `pdo` or `doctrine/dbal` for database access in your PHP code.

---

## 17. Managing Access Control (ACL)

### 17.1. Define Rights as Bitmask Constants

Define rights as bitmask constants in your PHP code:

```php
const ACL_READ = 1;    // 0001
const ACL_ADD = 2;     // 0010
const ACL_EDIT = 4;    // 0100
const ACL_DELETE = 8;  // 1000
```

### 17.2. Define Roles and Permissions Using Bitmask

- Assign a bitmask value for each route and role, combining rights as needed.
- Store roles/permissions in a config file, database, or as PHP arrays.

Example:

```php
$acl = [
    'admin' => [
        '*' => ACL_READ | ACL_ADD | ACL_EDIT | ACL_DELETE
    ],
    'user' => [
        '/' => ACL_READ,
        '/form' => ACL_READ | ACL_ADD,
        '/list' => ACL_READ,
        '/entity/{id}' => ACL_READ | ACL_EDIT,
    ],
    'guest' => [
        '/' => ACL_READ,
        '/list' => ACL_READ
    ]
];
```

### 17.3. Middleware for ACL with Bitmask Checking

- Implement a Slim middleware to check the user's role and allowed rights for the requested route and HTTP method.
- Map HTTP methods to bitmask rights:
  - GET → ACL_READ
  - POST → ACL_ADD
  - PUT/PATCH → ACL_EDIT
  - DELETE → ACL_DELETE
- Use bitwise AND to check if the right is granted.

Example:

```php
// In your middleware
$role = $_SESSION['role'] ?? 'guest';
$path = $request->getUri()->getPath();
$method = $request->getMethod();
$actionMap = [
    'GET' => ACL_READ,
    'POST' => ACL_ADD,
    'PUT' => ACL_EDIT,
    'PATCH' => ACL_EDIT,
    'DELETE' => ACL_DELETE
];
$requiredRight = $actionMap[$method] ?? 0;
$allowed = $acl[$role][$path] ?? $acl[$role]['*'] ?? 0;
if (($allowed & $requiredRight) === 0) {
    return $response->withStatus(403);
}
```

### 17.4. Assign Roles

- Assign roles to users at login or registration.
- Store the role in the session or JWT token.

---
