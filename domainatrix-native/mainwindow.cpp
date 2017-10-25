#include "mainwindow.h"
#include "ui_mainwindow.h"
#include <iostream>
#include <QAbstractTableModel>
#include <QDesktopServices>

using std::cout;
using std::cerr;
using std::endl;

struct DomainEntry
{
	QString url;
	bool activeDNS;
	bool activePing;
	bool activeHTTP;

	bool operator !=(const DomainEntry& rhs) const
	{
		return url != rhs.url;
	}

	bool operator ==(const DomainEntry& rhs) const
	{
		return url == rhs.url;
	}

	bool operator <(const DomainEntry& rhs) const
	{
		return url < rhs.url;
	}
};

// columns:
// DNS | Ping | Http | Address
class DomainDataModel : public QAbstractTableModel
{
public:
	friend class MainWindow;
	QVector<DomainEntry> entries;

	DomainDataModel()
	{}

	QModelIndex index(int row, int column, const QModelIndex &parent = QModelIndex()) const
	{
		return createIndex(row, column, ((void*)&entries[row]));
	}

	QModelIndex parent(const QModelIndex &child) const
	{
		return QModelIndex();
	}

	int rowCount(const QModelIndex &parent = QModelIndex()) const
	{
		return entries.length();
	}

	int columnCount(const QModelIndex &parent = QModelIndex()) const
	{
		return 4;
	}

	QVariant data(const QModelIndex &index, int role) const
	{
		if(role != Qt::DisplayRole)
			return QVariant();
		if(index.row() >= entries.length())
			return QVariant();
		int row = index.row();
		const DomainEntry& e = entries[row];
		switch(index.column())
		{
		case 0: // DNS
			return e.activeDNS;
		case 1: // Ping
			return e.activePing;
		case 2: // HTTP
			return e.activeHTTP;
		case 3: // URL
			return e.url;
		default:
			return QVariant();
		}
	}

	QVariant headerData(int section, Qt::Orientation orientation, int role) const
	{
		if(role != Qt::DisplayRole)
			return QVariant();
		if(orientation != Qt::Horizontal)
			return QVariant();
		switch(section)
		{
		case 0:
			return QString("DNS");
		case 1:
			return QString("Ping");
		case 2:
			return QString("HTTP");
		case 3:
			return QString("Address");
		default:
			return QVariant();
		}
	}

	void propagateUpdate()
	{
		dataChanged(index(0,0), index(rowCount()-1,columnCount()-1));
	}
};

MainWindow::MainWindow(QWidget *parent) :
	QMainWindow(parent),
	ui(new Ui::MainWindow),
	refreshLocked(false)
{
	Domainatrix = QProcessEnvironment::systemEnvironment().value("DOMAINATRIX_OVERRIDE", "https://domainatrix.me");
	net = new QNetworkAccessManager();
	ui->setupUi(this);
	this->postAutoUi();
}

void MainWindow::postAutoUi()
{
	DomainDataModel* ddm = new DomainDataModel();
	ddm->entries.append(DomainEntry{"Loading remote entry list",false,false,false});
	rmodel = (void*)ddm;
	ui->dataTable->setModel(ddm);
	connect(net, SIGNAL(finished(QNetworkReply*)), this, SLOT(on_replyFinished(QNetworkReply*)));
	this->on_actionRefresh_triggered();
}

MainWindow::~MainWindow()
{
	delete ui;
}

void MainWindow::on_actionRefresh_triggered()
{
	if(this->refreshLocked)
		return;
	this->refreshLocked = true;
	this->ui->dataTable->setEnabled(false);

	QNetworkRequest req;
	QSslConfiguration config = QSslConfiguration::defaultConfiguration();
	config.setProtocol(QSsl::TlsV1_2OrLater);
	req.setSslConfiguration(config);
	QString timeStr = QString::asprintf("%lld", QDateTime::currentDateTimeUtc().toSecsSinceEpoch());
	req.setHeader(QNetworkRequest::ServerHeader, "application/json");
	QUrl url = QUrl(Domainatrix + "/data");
	QUrlQuery urlq;
	urlq.addQueryItem("t", timeStr);
	url.setQuery(urlq);
	req.setUrl(url);
	cerr << "Making request to: " << req.url().toString().toStdString() << endl;
	net->get(req);
}

void MainWindow::on_replyFinished(QNetworkReply* reply)
{
	DomainDataModel* model = (DomainDataModel*) rmodel;
	cerr << "Reply: " << reply->readBufferSize() << " bytes, " << reply->errorString().toStdString() << endl;
	if(reply->header(QNetworkRequest::ContentTypeHeader).toString().startsWith("application/json"))
	{
		QByteArray ba = reply->readAll();
		QJsonParseError perr;
		QJsonDocument doc = QJsonDocument::fromJson(ba, &perr);
		if(!doc.isNull())
		{
			model->beginRemoveRows(QModelIndex(), 0, model->rowCount()-1);
			model->entries.clear();
			model->endRemoveRows();
			for(QJsonValue val : doc.array())
			{
				if(!val.isObject())
					continue;
				QJsonObject obj = val.toObject();
				if(!obj.contains("domainName"))
					continue;
				DomainEntry ne;
				ne.url = obj["domainName"].toString();
				ne.activeDNS = (obj["dns"].toObject()["state"].toInt() == 0);
				ne.activePing = (obj["ping"].toObject()["state"].toInt() == 0);
				ne.activeHTTP = (obj["http"].toObject()["state"].toInt() == 0);
				model->entries.append(ne);
			}

			qSort(model->entries);
			model->beginInsertRows(QModelIndex(), 0, model->rowCount()-1);
			model->endInsertRows();
		}
	}
	this->refreshLocked = false;
	model->propagateUpdate();
	this->ui->dataTable->setEnabled(true);
	reply->deleteLater();
}

void MainWindow::on_actionQuit_triggered()
{
	this->close();
}

void MainWindow::on_dataTable_doubleClicked(const QModelIndex &index)
{
	if(!index.isValid())
		return;
	DomainEntry *e = (DomainEntry*)index.internalPointer();
	QDesktopServices::openUrl(QUrl(QString("http://") + e->url + QString("/")));
}
