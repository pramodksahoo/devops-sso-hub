<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=false; section>
    <#if section = "header">
        <div id="kc-logo">
            <div id="kc-logo-wrapper">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <circle cx="12" cy="16" r="1"></circle>
                    <path d="m7 11 V7a5 5 0 0 1 10 0v4"></path>
                </svg>
            </div>
        </div>
        SSO HUB
        <p>Enterprise DevOps Platform</p>
    <#elseif section = "form">
        <div id="kc-error-message">
            <#if message?has_content && message.summary?has_content>
                <div class="alert alert-error">
                    <span class="kc-feedback-text">${kcSanitize(message.summary)?no_esc}</span>
                </div>
            <#else>
                <div class="alert alert-error">
                    <span class="kc-feedback-text">An unexpected error occurred. Please try again.</span>
                </div>
            </#if>
            
            <div id="kc-form-buttons" class="${properties.kcFormGroupClass!}">
                <#if client?? && client.baseUrl?has_content>
                    <a href="${client.baseUrl}" class="${properties.kcButtonClass!} ${properties.kcButtonDefaultClass!} ${properties.kcButtonBlockClass!} ${properties.kcButtonLargeClass!}">
                        Return to Application
                    </a>
                </#if>
            </div>
        </div>
    </#if>
</@layout.registrationLayout>