"""
pip install python-telegram-bot==13.14

Token: 6066452959:AAGJiHSAkelPTs_cwT-9KXEI0olvZmiZfAc DeD5trumentiBot
Possibili funzioni:
Permettere all'utente di creare una propria lista di magie da poter richiamare all'occorrenza. 3 liste per utente?
-Quando mostra una magia, fa apparire un inlinebutton che chiede se si voglia salvare la magia tra i preferiti?
"""
"""
Funzioni implementate:
-Ricerca per nome. Se esistono più magie, ritorna una lista da cui scegliere (cerca anche tra i nomi in inglese)
-Ricerca per frammento di descrizione. Come sopra
-Ricerca per classe e/o livello. TODO: ordinare le magie per livello?

start - Avvia il bot e mostra info generali
spell - Cerca le magie per nome
spells - Cerca le magie per classe/liv
spelldesc - Cerca le magie per Descrizione
condizioni - Cerca/mostra le condizioni
"""
from telegram import InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Updater, CommandHandler, MessageHandler, Filters, CallbackQueryHandler, ConversationHandler
import csv

SPELL, SPELLS, SPELLDESC = range(3)
SPELLS_CSV = "spells.csv"
CONDIZIONI_CSV = "conditions.csv"

def cleaner(context):
    context.user_data.pop('spells', None)
    context.user_data.pop('conditions', None)

def format_spell_otput(spell):
    description = spell['Description']
    aggiunta = ""
    # Se la descrizione è troppo lunga, devo abbreviarla o andrà in errore provando ad inviare il messaggio su TG
    if len(description) > 3500:
        description = description[:-(len(description) - 3500)]
        aggiunta = "..."
    message = f"{spell['Name']} \n[{spell['Original Name']}]\n" \
              f"{spell['Class']}|\n" \
              f"{spell['Level']}, {spell['School']}\n" \
              f"Tempo di Lancio: {spell['Casting Time']}\n" \
              f"Gittata: {spell['Range']}\n" \
              f"Componenti: {spell['Components']}\n" \
              f"Durata: {spell['Duration']}\n\n" \
              f"{description}{aggiunta}"
    # print(len(spell['Description']))
    # print(len(description))
    return message

def format_condition_otput(condition):
    description = condition['Description']
    aggiunta = ""
    # Se la descrizione è troppo lunga, devo abbreviarla o andrà in errore provando ad inviare il messaggio su TG
    if len(description) > 3500:
        description = description[:-(len(description) - 3500)]
        aggiunta = "..."
    message = f"{condition['Name']} \n[{condition['Original Name']}]\n" \
              f"{description}{aggiunta}"
    # print(len(spell['Description']))
    # print(len(description))
    return message


def start(update, context):
    update.message.reply_text("Questo bot è ancora un Work in Progress\nLe sue funzioni attuali sono:\n"
                              "/spell 'nome magia' per visualizzare i dettagli di una determinata magia. Si può usare "
                              "anche il nome inglese o un pezzo del nome.\n"
                              "/spelldesc 'frammento di descrizione' cerca il frammento di testo tra le descrizioni "
                              "delle magie e restituisce una lista selezionabile\n"
                              "/spells 'classe' 'livello' mostra una lista cliccabile delle magie corrispondenti per "
                              "la classe e livello. \nSi può non scegliere la classe per avere una lista di magie "
                              "generale del livello. \nSi può non scegliere il livello per avere una lista generale "
                              "di magie della classe"
                              "\n/condizioni 'nome' mostra la lista delle condizioni selezionabile. Si può usare "
                              "anche il nome inglese o un pezzo del nome."
                              "\n\n tutti i comandi possono essere usati senza specificare nulla. In quel caso il bot"
                              "chiederà altri dettagli")


# Define a function to handle the /spell command
def spell_handler(update, context):
    # Remove Spells, Conditions ecc from user_data
    cleaner(context)
    # Check if the user provided a spell name
    #print(f"Magia richiesta {context.args}")
    spell_name = ""
    
    # Questo metodo viene chiamato sia quando viene chiamato il comando /spell (quindi context.args sarà diverso da None)
    # sia quando il comando /spell era vuoto ed ha richiamato per ricevere il nome (quindi context.args sarà None perchè non è stato scritto /spell)
    if context.args == None:
        spell_name = update.message.text.lower()
    else:
        spell_name = " ".join(context.args).lower()
    print(f"Magia richiesta {spell_name}")
    if len(spell_name) == 0:
        # Ask the user which spell they want to view
        update.message.reply_text(
            'Scrivi il nome o un frammento del nome della magia da cercare (Nome '
            'nella versione italiana o inglese):')
        return SPELL
    else:
        # Look up the spell in the spells.csv file
        with open(SPELLS_CSV, 'r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            spells = [spell for spell in reader if
                      spell_name in spell['Name'].lower() or spell_name in
                      spell['Original Name'].lower()]

        # Check if we found any spells
        if len(spells) == 0:
            update.message.reply_text('Non ho trovato la magia che stai cercando.')
        elif len(spells) == 1:
            # Format the spell information as a message and send it to the user
            spell = spells[0]
            message = format_spell_otput(spell)
            update.message.reply_text(message)
        else:
            # usa la lista dei risultati per creare dei button inline cliccabili
            keyboard = [[InlineKeyboardButton(spell['Name'], callback_data=str(i))] for i, spell in enumerate(spells)]
            reply_markup = InlineKeyboardMarkup(keyboard)
            context.user_data['spells'] = spells
            update.message.reply_text('Ho trovato le seguenti magie:', reply_markup=reply_markup)
        return ConversationHandler.END


# Define a function to handle the /spell command
def spelldesc_handler(update, context):
    # Remove Spells, Conditions ecc from user_data
    cleaner(context)
    # Check if the user provided a spell name
    spelldesc_to_search = " "
    # Questo metodo viene chiamato sia quando viene chiamato il comando /spelldesc (quindi context.args sarà diverso da None)
    # sia quando il comando /spelldesc era vuoto ed ha richiamato per ricevere gli input (quindi context.args sarà None perchè non è stato scritto /spell)
    if context.args == None:
        spelldesc_to_search = update.message.text.lower()
    else:
        spelldesc_to_search = " ".join(context.args).lower()
    print(f"Frammento di descrizione ricercato: {spelldesc_to_search}")
    if len(spelldesc_to_search) == 0:
        # Ask the user which spell they want to view
        update.message.reply_text(
            'Specifica il pezzo di descrizione da cercare tra le magie')
        return SPELLDESC
    else:
        # Look up the spell in the spells.csv file
        with open(SPELLS_CSV, 'r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            spells = [spell for spell in reader if spelldesc_to_search in spell['Description'].lower()]

        # Check if we found any spells
        if len(spells) == 0:
            update.message.reply_text('Non ho trovato magie col frammento di descrizione cercato.')
        elif len(spells) == 1:
            # Format the spell information as a message and send it to the user
            spell = spells[0]
            message = format_spell_otput(spell)
            update.message.reply_text(message)
        else:
            # usa la lista dei risultati per creare dei button inline cliccabili
            keyboard = [[InlineKeyboardButton(spell['Name'], callback_data=str(i))] for i, spell in enumerate(spells)]
            reply_markup = InlineKeyboardMarkup(keyboard)
            context.user_data['spells'] = spells
            update.message.reply_text('Ho trovato le seguenti magie:', reply_markup=reply_markup)
        return ConversationHandler.END


# Define a function to handle the /spell command
def spells_handler(update, context):
    # Remove Spells, Conditions ecc from user_data
    cleaner(context)
    # Check if the user provided a spell name
    
    spells_to_search = ""
    # Questo metodo viene chiamato sia quando viene chiamato il comando /spells (quindi context.args sarà diverso da None)
    # sia quando il comando /spells era vuoto ed ha richiamato per ricevere gli input (quindi context.args sarà None perchè non è stato scritto /spell)
    if context.args == None:
        spells_to_search = update.message.text.split()
    else:
        spells_to_search = context.args
    print(f"Classe e o livello ricercato: {spells_to_search}")
    if len(spells_to_search) == 0:
        # Ask the user which spell they want to view
        update.message.reply_text(
            'Specifica "Classe" e/o "Livello". Se la magia è un "Trucchetto", '
            'puoi scrivere "T" o "trucchetto" o "0".\nEsempio: /spells Bardo 1; o /spells Druido 3; o /spells 2')
        return SPELLS
    else:
        # Look up the spell in the spells.csv file
        with open(SPELLS_CSV, 'r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            livello = ""
            classe = ""
            if len(spells_to_search) == 2:
                if spells_to_search[1].lower() == "t" or spells_to_search[1].lower() == "trucchetto" or spells_to_search[1].lower() == "0":
                    livello = "trucchetto"
                else:
                    livello = spells_to_search[1].lower()
                classe = spells_to_search[0].lower()
            else:
                if spells_to_search[0].lower() == "t" or spells_to_search[0].lower() == "trucchetto" or spells_to_search[0].lower() == "0":
                    livello = "trucchetto"
                # Se c'è solo un valore e non è un trucchetto, controllo se sia un numero. Se lo è, è il livello,
                # altrimenti è la classe
                elif spells_to_search[0].isdigit():
                    livello = spells_to_search[0].lower()
                else:
                    classe = spells_to_search[0].lower()

            spells = [spell for spell in reader if
                      classe in spell['Class'].lower() and livello in spell['Level'].lower()]

        # Check if we found any spells
        if len(spells) == 0:
            update.message.reply_text('Non ho trovato le magie che stai cercando.')
        elif len(spells) == 1:
            # Format the spell information as a message and send it to the user
            spell = spells[0]
            message = format_spell_otput(spell)
            update.message.reply_text(message)
        else:
            # usa la lista dei risultati per creare dei button inline cliccabili
            keyboard = [[InlineKeyboardButton(spell['Name'], callback_data=str(i))] for i, spell in enumerate(spells)]
            reply_markup = InlineKeyboardMarkup(keyboard)
            context.user_data['spells'] = spells
            update.message.reply_text('Ho trovato le seguenti magie:', reply_markup=reply_markup)
        return ConversationHandler.END


def spell_callback_handler(update, context):
    query = update.callback_query
    query_ind = int(query.data)
    if 'spells' in context.user_data:
        spells = context.user_data['spells']
        for i, spell in enumerate(spells):
            if i == query_ind:
                # usa la lista dei risultati per creare dei button inline cliccabili
                keyboard = [[InlineKeyboardButton(spell['Name'], callback_data=str(i))] for i, spell in enumerate(spells)]
                reply_markup = InlineKeyboardMarkup(keyboard)
                # Preparo la risposta
                message = format_spell_otput(spell)
                query.answer()
                query.edit_message_text(text=message, reply_markup=reply_markup)
                break
    elif 'conditions' in context.user_data:
        conditions = context.user_data['conditions']
        for i, condition in enumerate(conditions):
            if i == query_ind:
                # usa la lista dei risultati per creare dei button inline cliccabili
                #keyboard = [[InlineKeyboardButton(condition['Name'], callback_data=str(i))] for i, condition in enumerate(conditions)]
                #reply_markup = InlineKeyboardMarkup(keyboard)
                # Preparo la risposta
                message = format_condition_otput(condition)
                query.answer()
                #query.edit_message_text(text=message, reply_markup=reply_markup)
                query.edit_message_text(text=message)
                break

def cancel(update, context):
    user = update.message.from_user
    update.message.reply_text('Ok.',
                              reply_markup=ReplyKeyboardRemove())

    return ConversationHandler.END


# Define a function to handle the /condizioni command
def conditions_handler(update, context):
    # Remove Spells, Conditions ecc from user_data
    cleaner(context)
    
    condition_name = " ".join(context.args).lower()

    # Questo metodo viene chiamato quando viene chiamato il comando /condition
    # (se context.args sarà diverso da None cerca la condizione altrimenti mostra la lista)

    print(f"Condizione richiesta {condition_name}")
    if len(condition_name) == 0:
        condition_name = ''
    # Look up the spell in the spells.csv file
    with open(CONDIZIONI_CSV, 'r', encoding='utf-8') as file:
        reader = csv.DictReader(file)
        conditions = [condition for condition in reader if
                  condition_name in condition['Name'].lower() or condition_name in
                  condition['Original Name'].lower()]

    # Check if we found any spells
    if len(conditions) == 0:
        update.message.reply_text('Non ho trovato la Condizione che stai cercando.')
    elif len(conditions) == 1:
        # Format the spell information as a message and send it to the user
        condition = conditions[0]
        message = format_condition_otput(condition)
        update.message.reply_text(message)
    else:
        # usa la lista dei risultati per creare dei button inline cliccabili
        keyboard = [[InlineKeyboardButton(condition['Name'], callback_data=str(i))] for i, condition in enumerate(conditions)]
        reply_markup = InlineKeyboardMarkup(keyboard)
        context.user_data['conditions'] = conditions
        update.message.reply_text('Ho trovato le seguenti condizioni:', reply_markup=reply_markup)



# Create an instance of the Updater class and pass it our bot's token
updater = Updater('6066452959:AAGJiHSAkelPTs_cwT-9KXEI0olvZmiZfAc', use_context=True)


# Register the spell_handler function to handle the /spell command

# Usa la gestione delle Conversazioni per gestire l'ipotesi che l'utente invii il comando vuoto. 
# Quindi chiede di scrivere successivamente l'input
spell_conv_handler = ConversationHandler(
        entry_points=[CommandHandler('spell', spell_handler)],

        states={
            SPELL: [MessageHandler(Filters.text, spell_handler)]
        },
        fallbacks=[CommandHandler('000', cancel)]

    )
spells_conv_handler = ConversationHandler(
        entry_points=[CommandHandler('spells', spells_handler)],

        states={
            SPELLS: [MessageHandler(Filters.text, spells_handler)]
        },
        fallbacks=[CommandHandler('000', cancel)]

    )
spelldesc_conv_handler = ConversationHandler(
        entry_points=[CommandHandler('spelldesc', spelldesc_handler)],

        states={
            SPELLDESC: [MessageHandler(Filters.text, spelldesc_handler)]
        },
        fallbacks=[CommandHandler('000', cancel)]

    )

updater.dispatcher.add_handler(CommandHandler('start', start))
updater.dispatcher.add_handler(spell_conv_handler)
updater.dispatcher.add_handler(spells_conv_handler)
updater.dispatcher.add_handler(spelldesc_conv_handler)
updater.dispatcher.add_handler(CallbackQueryHandler(spell_callback_handler))
updater.dispatcher.add_handler(CommandHandler('condizioni', conditions_handler))

# Start the bot
updater.start_polling()
updater.idle()
