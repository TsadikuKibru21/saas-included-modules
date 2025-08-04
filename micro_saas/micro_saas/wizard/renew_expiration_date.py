from odoo import models, fields, api
from odoo.exceptions import ValidationError, UserError
import xmlrpc.client

import logging
_logger = logging.getLogger(__name__)

class UpdateExpirationWizard(models.TransientModel):
    _name = 'update.expiration.wizard'
    _description = 'Update Expiration Date Wizard'

    instance_id = fields.Many2one('odoo.docker.instance', string='Instance', required=True)
    expiration_date = fields.Date(string='Expiration Date', required=True)

    @api.model
    def default_get(self, fields_list):
        """Pre-fill the expiration_date from the odoo.docker.instance record."""
        res = super(UpdateExpirationWizard, self).default_get(fields_list)
        active_id = self.env.context.get('active_id')
        if active_id:
            instance = self.env['odoo.docker.instance'].browse(active_id)
            res['instance_id'] = instance.id
            res['expiration_date'] = instance.expiration_date
        return res

    # def action_update_expiration(self):
    #     """Update the expiration_date on the odoo.docker.instance record."""
    #     self.ensure_one()  # Ensure only one record is processed
    #     if self.instance_id:
    #         self.instance_id.write({'expiration_date': self.expiration_date})
    #         self.instance_id.tenant_service_update()
    #         self._send_renewal_email(self.instance_id)

    #     return {'type': 'ir.actions.act_window_close'}  # Close the wizard
    


    def action_update_expiration(self):
        """Update the expiration_date on the odoo.docker.instance record."""
        self.ensure_one()  # Ensure only one record is processed
        today = fields.Date.today()
        
        if self.instance_id:
            # Validate the new expiration date
            days_left = (self.expiration_date - today).days
            if days_left <= 0:  # Prevent setting to today or past
                raise UserError(
                    f"Cannot set expiration date to {self.expiration_date}. "
                    "The expiration date must be in the future."
                )
            
            # Update expiration date and related fields
            update_vals = {
                'expiration_date': self.expiration_date,
                'is_expires': False  # Reset since it's a valid future date
            }
            
            # Set state based on days_left, aligned with check_expiration
            if days_left > 5:  # More than 5 days aligns with 'running' (beyond grace period)
                update_vals['state'] = 'running'
            elif days_left <= 5:  # 1-5 days aligns with 'grace' in check_expiration
                update_vals['state'] = 'grace'
            # Note: We don’t set 'expired' since days_left <= 0 is blocked by validation
            
            self.instance_id.write(update_vals)
            
            # Call tenant service update and send renewal email
            self.instance_id.tenant_service_update()
            self._send_renewal_email(self.instance_id)
            
            # Log the update
            self.instance_id.add_to_log(
                f"[INFO] Expiration date updated to {self.expiration_date}, "
                f"state set to {update_vals['state']} on {today}, {days_left} days left"
            )
            _logger.info(
                f"Instance {self.instance_id.name} expiration updated to {self.expiration_date}, "
                f"state set to {update_vals['state']}"
            )

        return {'type': 'ir.actions.act_window_close'}  # Close the wizard

    def _send_renewal_email(self, instance):
        """Send renewal confirmation email to the customer."""
        if not instance.customer.email:
            _logger.warning(f"No email found for customer {instance.customer.name} of instance {instance.name}")
            return

        mail_template = self.env.ref('micro_saas.mail_template_renewal_notification', raise_if_not_found=False)
        if not mail_template:
            _logger.error("Email template 'mail_template_renewal_notification' not found.")
            return

        # Base variables
        customer_name = instance.customer.name or instance.customer.email
        instance_name = instance.name
        expiration_date = instance.expiration_date

        # Email content
        subject = f"Congratulations! Your Subscription for {instance_name} Has Been Renewed"
        status_message = "Subscription Renewed Successfully!"
        body_content = f"""
            Congratulations! Your subscription for your instance <strong>{instance_name}</strong> has been successfully renewed. 
            The new expiration date is <strong>{expiration_date}</strong>. Thank you for continuing with us!
        """
        button_text = "View Subscription"

        # Enhanced HTML email template matching _send_storage_email
        body_html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
            <div style="background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <h1 style="color: #2c3e50; margin: 0 0 20px 0; font-size: 24px;">Zoorya Subscription Renewal</h1>
                <p style="color: #666666; line-height: 1.6; margin: 0 0 15px 0;">
                    Dear {customer_name},
                </p>
                <div style="background-color: #e8f5e9; padding: 15px; border-radius: 5px; margin: 0 0 20px 0; border-left: 4px solid #2ecc71;">
                    <p style="margin: 0; color: #2ecc71; font-weight: bold;">{status_message}</p>
                </div>
                <p style="color: #666666; line-height: 1.6; margin: 0 0 20px 0;">
                    {body_content}
                </p>
                <p style="color: #666666; line-height: 1.6; margin: 0;">
                    Need help? Contact our support team at <a href="mailto:info@zoorya.et" style="color: #3498db;">info@zoorya.et</a>.<br>
                    Best regards,<br>
                    The Zoorya Team
                </p>
            </div>
            <div style="text-align: center; padding: 15px; color: #999999; font-size: 12px;">
                © 2025 Zoorya. All rights reserved.
            </div>
        </div>
        """

        mail_values = {
            'subject': subject,
            'body_html': body_html,
            'email_from': self.env.company.email or 'no-info@zoorya.et',
            'email_to': instance.customer.email,
            'auto_delete': True,
        }

        try:
            mail = self.env['mail.mail'].sudo().create(mail_values)
            mail.send()
            instance.add_to_log(f"[INFO] Sent renewal email to {instance.customer.email}: {subject}")
            _logger.info(f"Sent renewal email for instance {instance.name} to {instance.customer.email}")
        except Exception as e:
            _logger.error(f"Failed to send renewal email for instance {instance.name}: {str(e)}")
            instance.add_to_log(f"[ERROR] Failed to send renewal email: {str(e)}")