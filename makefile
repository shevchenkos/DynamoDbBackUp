.PHONY: galaxy-install ping

install: galaxy-install

galaxy-install:
	ansible-galaxy install -r requirements.yml --roles-path roles --force --ignore-errors

ping:
	ansible all -i hosts -m ping
