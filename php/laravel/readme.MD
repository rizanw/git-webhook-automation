# git-pull-automation (php-laravel)

## how to use it?
1. copy `webhook.sh` to laravel base directory.
2. make `webhook.sh` executable.  
    ```bash 
    chmod +x webhook.sh
    ``` 
3. copy `WebhookController.php` to your laravel controllers folder. and make sure that the `namespace` are correctly.   
4. go to `config/app.php` then add this to the array.   
    ```php  
    'webhook_secret' => env('WEBHOOK_SECRET'),   
    ```  
5. In your .env file, add your webhook secret:   
   ```env  
   WEBHOOK_SECRET=your_secret_should_be  
   ```   
6. In your `WebhookController.php`, uncomment one of validation method.      
    if you are using github, it should be like this:   
    ```php   
    /** uncomment one of these:  */ 
    // if u are using github:
    $this->validateGithubWebhook(config('app.webhook_secret'), $request); 
    // if u are using gitlab
    // $this->validateGitlabWebhook(config('app.webhook_secret'), $request); 
    ```  
    or if you are using gitlab:    
    ```php   
    /** uncomment one of these:  */ 
    // if u are using github:
    // $this->validateGithubWebhook(config('app.webhook_secret'), $request); 
    // if u are using gitlab
    $this->validateGitlabWebhook(config('app.webhook_secret'), $request); 
    ```   
7. create api router to `routes/api.php`   
    ```php
    Route::post('/webhook', 'WebhookController@handle'); 
    ```

   
## optional:
you can also generate the secret token using openssl, example: 
```bash
openssl rand -hex 32
```
```bash
6f39d2be950f9c4dfc3df09fd7d43c8274f26da835427532d13abdc08b442695
```

Enjoy!  