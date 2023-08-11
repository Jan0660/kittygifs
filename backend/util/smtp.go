package util

import (
	"bytes"
	"crypto/tls"
	"fmt"
	"log"
	"net"
	"net/mail"
	"net/smtp"
	"os"
	"text/template"
)

var VerificationEmailTemplate *template.Template
var EmailChangeEmailTemplate *template.Template

func LoadEmailTemplates() {
	Do := func(path string) *template.Template {
		content, err := os.ReadFile(path)
		if err != nil {
			log.Fatalln(err)
		}
		t, err := template.New(path).Parse(string(content))
		if err != nil {
			log.Fatalln(err)
		}
		return t
	}

	VerificationEmailTemplate = Do("./resources/verificationMail.template")
	EmailChangeEmailTemplate = Do("./resources/emailChangeMail.template")
}

func ExecuteTemplate(t *template.Template, data interface{}) (string, error) {
	var b bytes.Buffer
	err := t.Execute(&b, data)
	if err != nil {
		return "", err
	}
	return b.String(), nil
}

func SendEmail(smtpConfig *SmtpConfiguration, to, subject, body string) error {
	// thanks to https://gist.github.com/chrisgillis/10888032
	fromMail := mail.Address{smtpConfig.FromName, smtpConfig.FromAddress}
	toMail := mail.Address{"", to}

	// Setup headers
	headers := make(map[string]string)
	headers["From"] = fromMail.String()
	headers["To"] = toMail.String()
	headers["Subject"] = subject

	// Setup message
	message := ""
	for k, v := range headers {
		message += fmt.Sprintf("%s: %s\r\n", k, v)
	}
	message += "\r\n" + body

	host, _, _ := net.SplitHostPort(smtpConfig.ServerAddress)

	auth := smtp.PlainAuth("", smtpConfig.Username, smtpConfig.Password, host)

	// TLS config
	tlsconfig := &tls.Config{
		InsecureSkipVerify: true,
		ServerName:         host,
	}

	// Here is the key, you need to call tls.Dial instead of smtp.Dial
	// for smtp servers running on 465 that require an ssl connection
	// from the very beginning (no starttls)
	tlsConn, err := tls.Dial("tcp", smtpConfig.ServerAddress, tlsconfig)
	if err != nil {
		return err
	}

	mailConn, err := smtp.NewClient(tlsConn, host)

	// Auth
	if err = mailConn.Auth(auth); err != nil {
		return err
	}

	// To && From
	if err = mailConn.Mail(fromMail.Address); err != nil {
		return err
	}

	if err = mailConn.Rcpt(toMail.Address); err != nil {
		return err
	}

	// Data
	w, err := mailConn.Data()
	if err != nil {
		return err
	}

	_, err = w.Write([]byte(message))
	if err != nil {
		return err
	}

	err = w.Close()
	if err != nil {
		return err
	}

	err = mailConn.Quit()
	if err != nil {
		return err
	}

	if err != nil {
		return err
	}
	return nil
}
