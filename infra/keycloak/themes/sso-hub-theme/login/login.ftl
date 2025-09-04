<#import "template.ftl" as layout>
<@layout.registrationLayout displayInfo=social.displayInfo displayWide=(realm.password && social.providers??); section>
    <#if section = "header">
        <div id="kc-logo">
            <div id="kc-logo-wrapper">
                <!-- Modern DevOps Integration Icon -->
                <svg width="40" height="40" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <!-- Central Hub -->
                    <circle cx="24" cy="24" r="8" fill="url(#gradient1)" opacity="0.9"/>
                    
                    <!-- Connection Nodes -->
                    <circle cx="12" cy="12" r="4" fill="#3b82f6"/>
                    <circle cx="36" cy="12" r="4" fill="#8b5cf6"/>
                    <circle cx="36" cy="36" r="4" fill="#10b981"/>
                    <circle cx="12" cy="36" r="4" fill="#f59e0b"/>
                    
                    <!-- Connection Lines -->
                    <path d="M16 16L24 24M32 16L24 24M32 32L24 24M16 32L24 24" stroke="white" stroke-width="2" opacity="0.8"/>
                    
                    <!-- Security Shield Overlay -->
                    <path d="M24 4C24 4 32 6 32 14V26C32 30 28 34 24 36C20 34 16 30 16 26V14C16 6 24 4 24 4Z" 
                          stroke="white" stroke-width="1.5" fill="none" opacity="0.6"/>
                    
                    <!-- Gradient Definitions -->
                    <defs>
                        <linearGradient id="gradient1" x1="16" y1="16" x2="32" y2="32">
                            <stop offset="0%" stop-color="#ffffff"/>
                            <stop offset="100%" stop-color="#e0e7ff"/>
                        </linearGradient>
                    </defs>
                </svg>
            </div>
        </div>
        <h1>SSO HUB</h1>
        <p>Enterprise DevOps Platform</p>
    <#elseif section = "form">
    <div id="kc-form" <#if realm.password && social.providers??>class="${properties.kcContentWrapperClass!}"</#if>>
      <div id="kc-form-wrapper" <#if realm.password && social.providers??>class="${properties.kcFormSocialAccountContentClass!} ${properties.kcFormSocialAccountClass!}"</#if>>
        <#if realm.password>
            <form id="kc-form-login" onsubmit="login.disabled = true; return true;" action="${url.loginAction}" method="post">
                <div class="${properties.kcFormGroupClass!}">
                    <label for="username" class="${properties.kcLabelClass!}"><#if !realm.loginWithEmailAllowed>${msg("username")}<#elseif !realm.registrationEmailAsUsername>${msg("usernameOrEmail")}<#else>${msg("email")}</#if></label>

                    <#if usernameEditDisabled??>
                        <input tabindex="1" id="username" class="${properties.kcInputClass!}" name="username" value="${(login.username!'')}" type="text" disabled />
                    <#else>
                        <input tabindex="1" id="username" class="${properties.kcInputClass!}" name="username" value="${(login.username!'')}"  type="text" autofocus autocomplete="off" />
                    </#if>
                </div>

                <div class="${properties.kcFormGroupClass!}">
                    <label for="password" class="${properties.kcLabelClass!}">${msg("password")}</label>
                    <input tabindex="2" id="password" class="${properties.kcInputClass!}" name="password" type="password" autocomplete="off" />
                </div>

                <div class="${properties.kcFormGroupClass!} ${properties.kcFormSettingClass!}">
                    <div id="kc-form-options">
                        <#if realm.rememberMe && !usernameEditDisabled??>
                            <div class="checkbox">
                                <input tabindex="3" id="rememberMe" name="rememberMe" type="checkbox" <#if login.rememberMe?? && login.rememberMe>checked</#if>> 
                                <label for="rememberMe">${msg("rememberMe")}</label>
                            </div>
                        </#if>
                        </div>
                        <div class="${properties.kcFormOptionsWrapperClass!}">
                            <#if realm.resetPasswordAllowed>
                                <span><a tabindex="5" href="${url.loginResetCredentialsUrl}">${msg("doForgotPassword")}</a></span>
                            </#if>
                        </div>

                  </div>

                  <div id="kc-form-buttons" class="${properties.kcFormGroupClass!}">
                      <input type="hidden" id="id-hidden-input" name="credentialId" <#if auth.selectedCredential?has_content>value="${auth.selectedCredential}"</#if>/>
                      <input tabindex="4" class="${properties.kcButtonClass!} ${properties.kcButtonPrimaryClass!} ${properties.kcButtonBlockClass!} ${properties.kcButtonLargeClass!}" name="login" id="kc-login" type="submit" value="${msg("doLogIn")}"/>
                  </div>
            </form>
        </#if>
        </div>
        <#if realm.password && social.providers??>
            <div id="kc-social-providers" class="${properties.kcFormSocialAccountContentClass!} ${properties.kcFormSocialAccountClass!}">
                <ul class="${properties.kcFormSocialAccountListClass!} <#if social.providers?size gt 4>${properties.kcFormSocialAccountDoubleListClass!}</#if>">
                    <#list social.providers as p>
                        <li class="${properties.kcFormSocialAccountListLinkClass!} kc-social-item">
                            <a href="${p.loginUrl}" id="zocial-${p.alias}" class="zocial ${p.providerId}">
                                <span>${p.displayName!}</span>
                            </a>
                        </li>
                    </#list>
                </ul>
            </div>
        </#if>
      </div>
    <#elseif section = "info" >
        <#if realm.password && realm.registrationAllowed && !registrationDisabled??>
            <div id="kc-registration">
                <span>${msg("noAccount")} <a tabindex="6" href="${url.registrationUrl}">${msg("doRegister")}</a></span>
            </div>
        </#if>
        <!-- Security Indicator -->
        <div class="security-indicator">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2L2 7v8c0 5.5 3.8 10.7 10 12 6.2-1.3 10-6.5 10-12V7l-10-5z"/>
                <path d="M9 12l2 2 4-4"/>
            </svg>
            <span>Secure Enterprise Authentication</span>
        </div>
    </#if>

</@layout.registrationLayout>
